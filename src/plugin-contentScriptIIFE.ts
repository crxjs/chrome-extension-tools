import {
  OutputAsset,
  OutputBundle,
  Plugin,
  PluginContext,
  rollup,
  RollupOptions,
} from 'rollup'
import { isContentScript } from './files.sharedEvents'
import { isChunk } from './helpers'
import { dirname, join, parse } from './path'
import { helperScripts } from './plugin-contentScriptESM'
import {
  generateFileNames,
  getRpceAPI,
  RpceApi,
} from './plugin_helpers'
import { CrxPlugin, Manifest } from './types'

/** Transforms the pure ESM output bundle into a hybrid ESM/IIFE bundle */
export const contentScriptIIFE = (): CrxPlugin => {
  let api: RpceApi

  return {
    name: 'content-script-IIFE',
    apply: 'build',
    enforce: 'post',
    buildStart(options) {
      api = getRpceAPI(options.plugins)!
    },
    async generateBundle({ sourcemap, chunkFileNames }, bundle) {
      const iifeFileNames = new Set<string>()
      for (const file of api.filesByRefId.values()) {
        if (isContentScript(file)) {
          const fileName = this.getFileName(file.refId)
          iifeFileNames.add(fileName)
        }
      }

      const iifeFiles = await Promise.all(
        [...iifeFileNames].map((input) =>
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

      const iifeBundle = Object.assign({}, ...iifeFiles)

      const esmInputs = Object.entries(bundle)
        .filter(([, file]) => {
          return (
            isChunk(file) &&
            file.isEntry &&
            !iifeFileNames.has(file.fileName)
          )
        })
        .map(([key]) => key)

      // Regenerate everything else as a new ESM bundle
      // This removes unused code and re-chunks files
      const esmBundle = await regenerateBundle.call(
        this,
        {
          input: esmInputs,
          output: {
            format: 'esm',
            sourcemap,
            chunkFileNames,
            entryFileNames: '[name].js',
          },
          onwarn: (warning) => this.warn(warning),
        },
        bundle,
      )

      // Remove chunks, leaving only assets
      Object.entries(bundle)
        .filter(([, v]) => isChunk(v))
        .forEach(([key]) => {
          delete bundle[key]
        })

      // Refill bundle with our new mixed format files
      Object.assign(bundle, esmBundle, iifeBundle)

      // update manifest content scripts with output names
      const manifestAsset = bundle[
        'manifest.json'
      ] as OutputAsset
      const manifest: Manifest = JSON.parse(
        manifestAsset.source as string,
      )

      for (const script of manifest.content_scripts ?? []) {
        script.js?.forEach((name, i) => {
          if (helperScripts.includes(name)) return
          const { outputFileName } = generateFileNames(name)
          const { refId } =
            api.filesByFileName.get(outputFileName)!
          // to support dynamic file names later
          script.js![i] = this.getFileName(refId)
        })
      }

      manifestAsset.source = JSON.stringify(manifest)
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
