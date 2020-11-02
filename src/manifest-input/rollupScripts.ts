import path from 'path'
import {
  PluginContext,
  OutputOptions,
  OutputBundle,
} from 'rollup'
import { OutputChunk } from 'rollup'
import { rollup, Plugin } from 'rollup'
import { isChunk } from '../helpers'
import { ManifestInputPluginCache } from '../plugin-options'

export function rollupScripts(
  cache: ManifestInputPluginCache,
): (
  this: PluginContext,
  options: OutputOptions,
  bundle: OutputBundle,
  isWrite: boolean,
) => Promise<void> {
  return async function(options, bundle) {
    await Promise.all(
      Object.keys(cache.iife).map(
        emitIIFE(options, bundle).bind(this),
      ),
    )

    pruneBundle(bundle)
  }
}

function emitIIFE(
  options: OutputOptions,
  bundle: OutputBundle,
): (this: PluginContext, key: string) => Promise<void> {
  return async function(key) {
    const chunk = bundle[key]

    if (isChunk(chunk)) {
      // TODO: remove chunks that only are used by iife entries
      // get entry build using existing bundle
      const build = await rollup({
        input: key,
        // don't need to do anything else
        plugins: [
          {
            name: 'esm-input-to-iife',
            resolveId(source, importer) {
              if (typeof importer === 'undefined') {
                return source
              } else {
                const dirname = path.dirname(importer)
                const resolved = path.join(dirname, source)

                return resolved
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
                throw new Error(`Could not load: ${id}`)
              }
            },
          } as Plugin,
        ],
      })

      // convert bundle to iife format
      const {
        output: [output],
      } = await build.generate({
        ...options,
        format: 'iife',
      })

      // replace entry file with iife chunk
      delete bundle[key]

      this.emitFile({
        type: 'asset',
        fileName: key,
        source: output.code,
      })
    }
  }
}

/**
 * Removes non-entry chunks that are not imported other files
 */
function pruneBundle(bundle: OutputBundle) {
  const chunks = Object.entries(bundle).filter((x): x is [
    string,
    OutputChunk,
  ] => isChunk(x[1]))

  const imports: string[] = chunks.reduce(
    (r, [, { imports }]) => r.concat(imports),
    [] as string[],
  )

  chunks.forEach(([key, chunk]) => {
    if (!chunk.isEntry && !imports.includes(key)) {
      delete bundle[key]
    }
  })
}
