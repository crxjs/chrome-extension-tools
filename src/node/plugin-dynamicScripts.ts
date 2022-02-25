import MagicString from 'magic-string'
import { parse } from './path'
import { rebuildFiles } from './plugin-fileWriter'
import type { CrxPluginFn } from './types'

type ScriptType = 'script' | 'module' | 'iife'
const isScriptType = (x: string): x is ScriptType =>
  ['script', 'module', 'iife'].includes(x)

/** A Map of dynamic scripts from virtual module id to the ref id of the emitted script */
export const dynamicScripts = new Map<
  string,
  {
    /** The resolved id of the script file */
    chunkId: string
    /** TODO: implement IIFE format */
    type: ScriptType
    /** File name of the script file or loader */
    fileName?: string
    /** The ref id of the emitted chunk */
    refId?: string
  }
>()

export const pluginDynamicScripts: CrxPluginFn = () => {
  return [
    {
      name: 'crx:dynamic-scripts',
      apply: 'serve',
      enforce: 'pre',
      async resolveId(source, importer) {
        if (importer && source.includes('?script')) {
          const [name, query] = source.split('?')
          const type = query.split('&')[1] ?? 'script'

          if (!isScriptType(type))
            throw new Error(`Invalid script type: ${source}`)

          const resolved = await this.resolve(name, importer)
          if (resolved === null) return null

          const chunkId = resolved.id
          const id = `\0${chunkId}?${query}`

          const script = dynamicScripts.get(id)
          if (!script) dynamicScripts.set(id, { chunkId, type })

          return id
        }
      },
      async load(id) {
        const script = dynamicScripts.get(id)
        if (script) {
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
      async buildStart() {
        // pre-bundle dynamic scripts
        for (const [id, { type, chunkId }] of dynamicScripts) {
          const refId = this.emitFile({
            type: 'chunk',
            id: chunkId,
            name: parse(chunkId).base,
          })
          dynamicScripts.set(id, { chunkId, refId, type })
        }
      },
      async resolveId(source, importer) {
        if (importer && source.includes('?script')) {
          const [name, query] = source.split('?')
          const type = query.split('&')[1] ?? 'script'

          if (!isScriptType(type))
            throw new Error(`Invalid script type: ${source}`)

          const resolved = await this.resolve(name, importer)
          if (resolved === null) return null

          const chunkId = resolved.id
          const id = `\0${chunkId}?${query}`

          const script = dynamicScripts.get(id)
          if (!script) dynamicScripts.set(id, { chunkId, type })

          return id
        }
      },
      async load(id) {
        if (dynamicScripts.has(id)) {
          let { chunkId, refId, type } = dynamicScripts.get(id)!
          if (!refId) {
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
