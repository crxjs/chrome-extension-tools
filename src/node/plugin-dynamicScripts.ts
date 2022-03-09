import MagicString from 'magic-string'
import { ResolvedConfig } from 'vite'
import { _debug } from './helpers'
import { parse, relative } from './path'
import { rebuildFiles } from './plugin-fileWriter--events'
import type { CrxPluginFn } from './types'
import { dynamicScriptId } from './virtualFileIds'

const debug = _debug('dynamic')

type ScriptType = 'script' | 'module' | 'iife'
const isScriptType = (x: string): x is ScriptType =>
  ['script', 'iife'].includes(x)

/** A Map of dynamic scripts from virtual module id to the ref id of the emitted script */
export const dynamicScripts = new Map<
  string,
  {
    /** The resolved id of the script file */
    chunkId: string
    /** TODO: implement IIFE format */
    type: ScriptType
    /** Output file name of the script file or loader */
    fileName?: string
    /** The ref id of the emitted chunk */
    refId?: string
  }
>()

export const pluginDynamicScripts: CrxPluginFn = () => {
  let config: ResolvedConfig
  return [
    {
      name: 'crx:dynamic-scripts',
      apply: 'serve',
      enforce: 'pre',
      configResolved(_config) {
        config = _config
      },
      async resolveId(source, importer) {
        if (!importer) return null
        if (source.includes('?script')) {
          debug('serve:resolveId : source %s', source)

          const [name, query] = source.split('?')
          const type = query.split('&')[1] ?? 'script'

          if (!isScriptType(type))
            throw new Error(`Invalid script type: ${source}`)

          const resolved = await this.resolve(name, importer, {
            skipSelf: true,
          })
          if (resolved === null) return null

          const chunkId = resolved.id
          const fileName = relative(config.root, chunkId)
          const id = `${dynamicScriptId}/${fileName}`

          const script = dynamicScripts.get(id)
          if (!script) dynamicScripts.set(id, { chunkId, type, fileName })

          debug('serve:resolveId : chunk id %s', chunkId)
          debug('serve:resolveId : id %s', id)
          debug('serve:resolveId : fileName %s', fileName)

          return id
        }
      },
      async load(id) {
        const script = dynamicScripts.get(id)
        if (script) {
          debug('serve:load : script %O', script)
          if (!script.fileName) await rebuildFiles()
          const { fileName } = dynamicScripts.get(id) ?? {}
          if (!fileName)
            throw new Error(
              'dynamic script filename is undefined. this is a bug, please report it to rollup-plugin-chrome-extension',
            )
          return `export default "${fileName}"`
        }

        return null
      },
    },
    {
      name: 'crx:dynamic-scripts',
      apply: 'build',
      enforce: 'pre',
      configResolved(_config) {
        config = _config
      },
      async buildStart() {
        // pre-bundle dynamic scripts
        for (const [id, { type, chunkId }] of dynamicScripts) {
          debug('build:buildStart : emit %s', id)
          const refId = this.emitFile({
            type: 'chunk',
            id: chunkId,
            name: parse(chunkId).base,
          })
          dynamicScripts.set(id, { chunkId, refId, type })
        }
        debug('build:buildStart : end')
      },
      async resolveId(source, importer) {
        if (!importer) return null
        if (source.includes('?script')) {
          debug('build:resolveId : source %s', source)
          const [name, query] = source.split('?')
          const type = query.split('&')[1] ?? 'script'

          if (!isScriptType(type))
            throw new Error(`Invalid script type: ${source}`)

          const resolved = await this.resolve(name, importer, {
            skipSelf: true,
          })
          if (resolved === null) return null

          const chunkId = resolved.id
          const fileName = relative(config.root, chunkId)
          const id = `${dynamicScriptId}/${fileName}`

          const script = dynamicScripts.get(id)
          if (!script) dynamicScripts.set(id, { chunkId, type })

          debug('serve:resolveId : chunk id %s', chunkId)
          debug('serve:resolveId : id %s', id)
          debug('serve:resolveId : fileName %s', fileName)

          return id
        }
      },
      async load(id) {
        if (dynamicScripts.has(id)) {
          let { chunkId, refId, type } = dynamicScripts.get(id)!
          debug('serve:load : script %O', { chunkId, refId, type })
          if (!refId) {
            debug('serve:load : emit', chunkId)
            refId = this.emitFile({
              type: 'chunk',
              id: chunkId,
              name: parse(chunkId).base,
            })
            dynamicScripts.set(id, { chunkId, refId, type })
          }

          return `export default __IMPORTED_SCRIPT_${refId}__`
        }

        return null
      },
    },
    {
      name: 'crx:dynamic-scripts',
      apply: 'build',
      enforce: 'post',
      // this needs to be done after the script loaders are emitted, which happens in renderCrxManifest
      renderCrxManifest(manifest, bundle) {
        for (const chunk of Object.values(bundle))
          if (chunk.type === 'chunk') {
            const magic = new MagicString(chunk.code)
            for (const [id, { fileName, refId }] of dynamicScripts) {
              if (refId)
                if (chunk.modules[id])
                  if (fileName) {
                    const placeholder = `__IMPORTED_SCRIPT_${refId}__`
                    const index = chunk.code.indexOf(placeholder)
                    // Overwrite placeholder with filename
                    magic.overwrite(
                      index,
                      index + placeholder.length,
                      JSON.stringify(`/${fileName}`),
                    )
                  } else {
                    throw new Error(`No file name for emitted file "${id}".`)
                  }
            }
            chunk.code = magic.toString()
          }

        return null
      },
    },
  ]
}
