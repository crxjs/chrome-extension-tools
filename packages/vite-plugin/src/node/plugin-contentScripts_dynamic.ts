import { ResolvedConfig } from 'vite'
import { ContentScript, contentScripts, hashScriptId } from './contentScripts'
import { fileReady } from './fileWriter'
import { basename } from './path'
import { CrxPluginFn } from './types'

const dynamicScriptRegEx = /import\.meta\.CRX_DYNAMIC_SCRIPT_(.+?);/g

/**
 * 1. Resolves `?script` import queries
 *
 * - Emits scripts to rollup or fileWriter
 * - Add scripts to contentScripts map
 * - Returns script w/ `?scriptId` query
 *
 *   - Build scriptId is refId from emitFile
 *   - Serve scriptId is hashed script `type` and `id`
 *
 * 2. Loads `?scriptId` queries as file name exports
 *
 * - Build: return import.meta.CRX_SCRIPT_<scriptId>
 * - Serve: await filesReady()
 *
 * 3. Renders dynamic script imports
 *
 * - Build: Replace import.meta.CRX_SCRIPT_<scriptId> with output file name
 * - Serve: do nothing, filenames are deterministic
 */
export const pluginDynamicContentScripts: CrxPluginFn = () => {
  let config: ResolvedConfig

  return [
    {
      name: 'crx:dynamic-content-scripts-loader',
      enforce: 'pre',
      configResolved(_config) {
        config = _config
      },
      async resolveId(_source: string, importer?: string) {
        if (importer && _source.includes('?script')) {
          const url = new URL(_source, 'stub://stub')
          if (url.searchParams.has('script')) {
            const [source] = _source.split('?')
            const resolved = await this.resolve(source, importer, {
              skipSelf: true,
            })
            if (!resolved)
              throw new Error(
                `Could not resolve dynamic script: "${_source}" from "${importer}"`,
              )
            const { id } = resolved

            let type: ContentScript['type'] = 'loader'
            if (url.searchParams.has('module')) {
              type = 'module'
            } else if (url.searchParams.has('iife')) {
              type = 'iife'
            }

            let refId: string
            if (config.command === 'build') {
              refId = this.emitFile({
                type: 'chunk',
                id,
                name: basename(id),
              })
            } else {
              refId = hashScriptId({ type, id })
            }

            const finalId = `${id}?scriptId=${refId}`
            contentScripts.set(finalId, {
              type,
              id,
              matches: ['<dynamic_script>'],
              refId,
            })

            return finalId
          } else if (url.searchParams.has('scriptId')) {
            return _source // was already resolved (happens with vite serve)
          }
        }
      },
      async load(id) {
        const script = id.includes('?scriptId=') && contentScripts.get(id)
        if (script)
          if (config.command === 'build') {
            return `export default import.meta.CRX_DYNAMIC_SCRIPT_${script.refId};`
          } else {
            await fileReady(script)
            return `export default ${JSON.stringify(script.fileName)};`
          }
      },
    },
    {
      name: 'crx:dynamic-content-scripts-build',
      apply: 'build',
      /**
       * Replace dynamic script placeholders during build.
       *
       * Can't use `renderChunk` b/c pre plugin crx:content-scripts uses
       * `generateBundle` to emit loaders. Must come after "enforce: pre".
       */
      generateBundle(options, bundle) {
        for (const chunk of Object.values(bundle))
          if (chunk.type === 'chunk') {
            if (dynamicScriptRegEx.test(chunk.code)) {
              const replaced = chunk.code.replace(
                dynamicScriptRegEx,
                (match, p1) => {
                  const script = contentScripts.get(p1)
                  if (typeof script === 'undefined')
                    throw new Error(
                      `Content script refId is undefined: "${match}"`,
                    )
                  if (typeof script.fileName === 'undefined')
                    throw new Error(
                      `Content script fileName is undefined: "${script.id}"`,
                    )

                  return `${JSON.stringify(script.fileName)};`
                },
              )
              chunk.code = replaced
            }
          }
      },
    },
  ]
}
