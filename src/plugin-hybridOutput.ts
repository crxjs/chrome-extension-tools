import {
  OutputBundle,
  Plugin,
  PluginContext,
  rollup,
  RollupOptions,
} from 'rollup'
import { isChunk } from './helpers'
import { dirname, join, parse, relative } from './path'
import { generateFileNames } from './plugin_helpers'
import { CompleteFile, CrxPlugin } from './types'

/** Transforms the pure ESM output bundle into a hybrid ESM/IIFE bundle */
export const hybridFormat = (): CrxPlugin => {
  let isViteServe = false
  let files: Map<string, CompleteFile>
  let root = process.cwd()
  const plugins = new Set<CrxPlugin>()

  return {
    name: 'hybrid-format',

    configResolved(config) {
      isViteServe = config.command === 'serve'
      config.plugins.forEach((p) => plugins.add(p))
    },

    buildStart(options) {
      options.plugins?.forEach((p) => plugins.add(p))

      const { api } = Array.from(plugins).find(
        ({ name }) => name === 'chrome-extension',
      )!

      files = api.files
      root = api.root
    },

    renderCrxManifest(manifest) {
      manifest.content_scripts = manifest.content_scripts?.map(
        ({ js, ...rest }) => ({
          ...rest,
          js: js?.map((x) => {
            const { name, dir } = parse(x)
            return join(dir, `${name}.js`)
          }),
        }),
      )

      return manifest
    },

    async generateBundle({ sourcemap, chunkFileNames }, bundle) {
      const entryFileNames = '[name].js'

      const filesForIIFE = Array.from(files.values()).filter(
        ({ fileType }) => fileType === 'CONTENT',
      )

      // Regenerate content scripts as IIFE
      const contentScriptJsFileNames = filesForIIFE.map(
        ({ id }) =>
          relative(root, generateFileNames(id).outputFileName),
      )

      /**
       * Problem: Vite Serve provides environment variables on `import.meta.env` as an object:
       *
       * ```javascript
       * import.meta.env = { ... }
       * ```
       *
       * When Rollup transpiles ESM to IIFE, `import.meta.env` is replaced with `undefined`:
       *
       * ```javascript
       * undefined = { ... } // invalid JavaScript!
       * ```
       *
       * This mini plugin patches that behavior:
       *
       * ```javascript
       * let __importMetaEnv;
       * __importMetaEnv = { ... }
       * ```
       *
       * REPL: https://replit.com/@jacksteamdev/rollup-repro-plugin-intro#rollup.config.js
       */
      const viteServeImportMetaEnv: Plugin = {
        name: 'fix-vite-serve-import-meta-env',
        intro: 'let __importMetaEnv;',
        resolveImportMeta(prop) {
          if (prop === 'env') return '__importMetaEnv'
          return null
        },
      }

      const contentScripts = await Promise.all(
        contentScriptJsFileNames.map((input) =>
          regenerateBundle
            .call(
              this,
              {
                input,
                // Don't rewrite "this" keyword in IIFEs
                context: 'this',
                // Raise warnings to host Rollup instance
                onwarn: (warning) => this.warn(warning),
                output: {
                  format: 'iife',
                  plugins: isViteServe
                    ? [viteServeImportMetaEnv]
                    : undefined,
                  sourcemap,
                },
              },
              bundle,
            )
            // Rollup strips the dir from the output file name,
            // need to rename the file in the new bundle
            .then((b) => {
              const [iifeChunk] = Object.values(b)
              const result = {
                [input]: { ...iifeChunk, fileName: input },
              }
              return result
            }),
        ),
      )

      /**
       * Regenerating to different formats can be kinda slow
       *
       * TODO: implement a cache to only regenerate changed files
       * - reconcile original bundle chunk modules to iife chunk modules
       * - look up changed iife's by reconciled chunk module names
       * - changed id -> bundle[chunk].modules -> iifeChunk.modules
       *
       * for (const [key, chunk] of Object.entries(bundle).filter(
       *   (x): x is [string, OutputChunk] => x[1].type === 'chunk',
       * )) {
       *   // This output file was changed
       *   console.log(
       *     key,
       *     // When one of these modules changed
       *     Object.keys(chunk.modules).filter(
       *       (k) => !k.includes('node_modules'),
       *     ),
       *   )
       * }
       *
       * Cache iifeBundle and delete the changed chunk,
       * then only build the changed file
       */
      const iifeBundle = Object.assign({}, ...contentScripts)

      const esmInputs = Object.entries(bundle)
        .filter(([, file]) => {
          return (
            isChunk(file) &&
            file.isEntry &&
            !contentScriptJsFileNames.includes(file.fileName)
          )
        })
        .map(([key]) => key)

      // Regenerate everything else as a new ESM bundle
      const esmBundle = await regenerateBundle.call(
        this,
        {
          input: esmInputs,
          output: {
            format: 'esm',
            sourcemap,
            chunkFileNames,
            entryFileNames,
          },
          onwarn: (warning) => this.warn(warning),
        },
        bundle,
      )

      // Remove the original chunks
      Object.entries(bundle)
        .filter(([, v]) => isChunk(v))
        .forEach(([key]) => {
          delete bundle[key]
        })

      // Refill bundle with our new mixed format files
      Object.assign(bundle, esmBundle, iifeBundle)
    },
  }
}

/** This is really fast b/c we don't use any plugins, and we use the previous bundle as the filesystem */
export async function regenerateBundle(
  this: PluginContext,
  { context, input, output, onwarn }: RollupOptions,
  bundle: OutputBundle,
): Promise<OutputBundle> {
  if (!output || Array.isArray(output)) {
    throw new TypeError(
      'options.output must be an OutputOptions object',
    )
  }

  if (typeof input === 'undefined') {
    throw new TypeError(
      'options.input should be an object, string array or string',
    )
  }

  // Don't do anything if input is an empty array
  if (Array.isArray(input) && input.length === 0) {
    return {}
  }

  // Transform input array to input object
  const inputValue = Array.isArray(input)
    ? input.reduce((r, x) => {
        const { dir, name } = parse(x)
        return { ...r, [join(dir, name)]: x }
      }, {} as Record<string, string>)
    : input

  const build = await rollup({
    context,
    input: inputValue,
    onwarn,
    plugins: [resolveFromBundle(bundle)],
  })

  let newBundle: OutputBundle
  await build.generate({
    ...output,
    plugins: [
      ...(output.plugins ?? []),
      {
        name: 'get-bundle',
        generateBundle(o, b) {
          newBundle = b
        },
      } as Plugin,
    ],
  })

  return newBundle!
}

export function resolveFromBundle(bundle: OutputBundle): Plugin {
  return {
    name: 'resolve-from-bundle',
    resolveId(source, importer) {
      if (typeof importer === 'undefined') {
        return source
      } else {
        const importdir = dirname(importer)
        const resolved = join(importdir, source)

        // if it's not in the bundle,
        //   tell Rollup not to try to resolve it
        return resolved in bundle ? resolved : false
      }
    },
    load(id) {
      const chunk = bundle[id]

      if (isChunk(chunk)) {
        return {
          code: chunk.code,
          map: chunk.map,
        }
      } else {
        // anything not in the bundle is external
        //  this doesn't make sense for a chrome extension,
        //    but we should let Rollup handle it
        return null
      }
    },
  }
}
