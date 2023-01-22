import { ResolvedConfig } from 'vite'
import { ContentScript, contentScripts, hashScriptId } from './contentScripts'
import { formatFileData, getFileName } from './fileWriter-utilities'
import { basename, relative } from './path'
import { CrxPluginFn } from './types'

// Rollup may use `import_meta` instead of `import.meta`
const _dynamicScriptRegEx = /\b(import.meta).CRX_DYNAMIC_SCRIPT_(.+?)[,;]/gm
const dynamicScriptRegEx = () => {
  // stupid stateful JS RegExp
  _dynamicScriptRegEx.lastIndex = 0
  return _dynamicScriptRegEx
}

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
 * - Serve: 
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

            const scriptId = hashScriptId({ type, id })
            const resolvedId = `${id}?scriptId=${scriptId}`
            let script = contentScripts.get(resolvedId)
            if (typeof script === 'undefined') {
              let refId: string
              let fileName: string | undefined
              let loaderName: string | undefined
              if (config.command === 'build') {
                refId = this.emitFile({
                  type: 'chunk',
                  id,
                  name: basename(id),
                })
              } else {
                refId = scriptId
                const relId = relative(config.root, id)
                fileName = getFileName({
                  type: type === 'iife' ? 'iife' : 'module',
                  id: relId,
                })
                if (type === 'loader')
                  loaderName = getFileName({ type, id: relId })
              }
              script = formatFileData({
                type,
                id: relative(config.root, id),
                isDynamicScript: true,
                fileName,
                loaderName,
                refId,
                scriptId,
                matches: [],
              })
              contentScripts.set(script.id, script)
            }

            return resolvedId
          } else if (url.searchParams.has('scriptId')) {
            return _source // was already resolved (happens with vite serve)
          }
        }
      },
      async load(id) {
        const index = id.indexOf('?scriptId=')
        if (index > -1) {
          const scriptId = id.slice(index + '?scriptId='.length)
          const script = contentScripts.get(scriptId)!
          if (config.command === 'build') {
            return `export default import.meta.CRX_DYNAMIC_SCRIPT_${script.refId};`
          } else if (typeof script.fileName === 'string') {
            return `export default ${JSON.stringify(script.fileName)};`
          } else {
            throw new Error(
              `Content script fileName is undefined: "${script.id}"`,
            )
          }
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
            if (dynamicScriptRegEx().test(chunk.code)) {
              const replaced = chunk.code.replace(
                dynamicScriptRegEx(),
                (match, p1, scriptKey) => {
                  const script = contentScripts.get(scriptKey)
                  if (typeof script === 'undefined')
                    throw new Error(
                      `Content script refId is undefined: "${match}"`,
                    )
                  if (typeof script.fileName === 'undefined')
                    throw new Error(
                      `Content script fileName is undefined: "${script.id}"`,
                    )

                  return `${JSON.stringify(
                    `/${script.loaderName ?? script.fileName}`,
                  )}${match.split(scriptKey)[1]}`
                },
              )
              // TODO: remove unused import_meta value?
              chunk.code = replaced
            }
          }
      },
    },
  ]
}
