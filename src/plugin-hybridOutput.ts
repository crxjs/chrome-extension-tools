import { dirname, join, parse, relative } from 'path'
import {
  OutputBundle,
  Plugin,
  PluginContext,
  rollup,
  RollupOptions,
} from 'rollup'
import { isChunk } from './helpers'
import { generateFileNames } from './plugin_helpers'
import { CompleteFile, RPCEPlugin } from './types'

/** Transforms the pure ESM output bundle into a hybrid ESM/IIFE bundle */
export const hybridFormat = (): RPCEPlugin => {
  let files: Set<CompleteFile>
  let root = process.cwd()
  const plugins = new Set<RPCEPlugin>()

  return {
    name: 'hybrid-format',

    configResolved(config) {
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

    async generateBundle({ sourcemap, chunkFileNames }, bundle) {
      const entryFileNames = '[name].js'

      const filesForIIFE = Array.from(files).filter(
        ({ fileType }) => fileType === 'CONTENT',
      )

      // Regenerate content scripts as IIFE
      const contentScriptJsFileNames = filesForIIFE.map(
        ({ id }) =>
          relative(root, generateFileNames(id).outputFileName),
      )

      const contentScripts = await Promise.all(
        contentScriptJsFileNames.map((input) =>
          regenerateBundle
            .call(
              this,
              {
                input,
                output: {
                  format: 'iife',
                  sourcemap,
                },
              },
              bundle,
            )
            // Rollup strips the dir from the output file name,
            // need to rename the file in the new bundle
            .then((b) => {
              const chunks = Object.values(b)
              const result = {
                [input]: { ...chunks[0], fileName: input },
              }
              return result
            }),
        ),
      )

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
  { input, output }: RollupOptions,
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
    input: inputValue,
    plugins: [resolveFromBundle(bundle)],
  })

  let newBundle: OutputBundle
  await build.generate({
    ...output,
    plugins: [
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
