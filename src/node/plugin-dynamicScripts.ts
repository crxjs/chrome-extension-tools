import fs from 'fs'
import jsesc from 'jsesc'
import MagicString from 'magic-string'
import { dirname, parse, relative, resolve } from './path'
import { rebuildFiles } from './plugin-fileWriter'
import type { CrxPluginFn } from './types'

/** A Map of dynamic scripts from virtual module id to the ref id of the emitted script */
export const dynamicScripts = new Map<
  string,
  { id: string; refId?: string; fileName?: string }
>()

function resolveScript({
  source,
  importer,
  root,
}: {
  source: string
  importer: string
  root: string
}) {
  const [preId] = source.split('?')
  const resolved = resolve(dirname(importer), preId)
  const id = parse(resolved).ext
    ? resolved
    : ['.ts', '.tsx', '.js', '.jsx', '.mjs']
        .map((x) => resolved + x)
        .find((x) => fs.existsSync(x)) ?? resolved
  const relId = relative(root, id)
  const scriptId = `${pluginName}::${relId}`
  return { scriptId, id }
}

const pluginName = 'crx:dynamic-scripts'
export const pluginDynamicScripts: CrxPluginFn = () => {
  let root: string

  return [
    {
      name: pluginName,
      apply: 'serve',
      enforce: 'pre',
      configResolved(config) {
        root = config.root
      },
      resolveId(source, importer) {
        if (importer && source.endsWith('?script')) {
          const { scriptId, id } = resolveScript({ source, importer, root })
          const script = dynamicScripts.get(scriptId)
          if (!script) dynamicScripts.set(scriptId, { id })
          return scriptId
        }

        return null
      },
      async load(scriptId) {
        const script = dynamicScripts.get(scriptId)
        if (script) {
          if (!script.fileName) await rebuildFiles()
          const { fileName } = dynamicScripts.get(scriptId) ?? {}
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
      name: pluginName,
      apply: 'build',
      enforce: 'pre',
      configResolved(config) {
        root = config.root
      },
      buildStart() {
        for (const [scriptId, { id }] of dynamicScripts) {
          const refId = this.emitFile({
            type: 'chunk',
            id,
            name: parse(id).base,
          })
          dynamicScripts.set(scriptId, { id, refId })
        }
      },
      resolveId(source, importer) {
        if (importer && source.endsWith('?script')) {
          const { scriptId, id } = resolveScript({ source, importer, root })
          const script = dynamicScripts.get(scriptId)
          if (!script) dynamicScripts.set(scriptId, { id })
          return scriptId
        }

        return null
      },
      async load(scriptId) {
        if (dynamicScripts.has(scriptId)) {
          let { id, refId } = dynamicScripts.get(scriptId)!
          if (!refId)
            refId = this.emitFile({
              type: 'chunk',
              id,
              name: parse(id).base,
            })
          dynamicScripts.set(scriptId, { id, refId })
          return `export default "%IMPORTED_SCRIPT_${refId}%"`
        }

        return null
      },
      generateBundle(options, bundle) {
        for (const [name, { id, refId }] of dynamicScripts) {
          if (!refId) continue // may have been added during build
          const fileName = this.getFileName(refId)
          dynamicScripts.set(name, { id, fileName, refId })
        }

        for (const chunk of Object.values(bundle)) {
          if (chunk.type === 'chunk')
            for (const [name, { fileName, refId }] of dynamicScripts) {
              if (chunk.modules[name])
                if (fileName && refId) {
                  const placeholder = `%IMPORTED_SCRIPT_${refId}%`
                  const index = chunk.code.indexOf(placeholder)
                  const magic = new MagicString(chunk.code)
                  // Overwrite placeholder with filename
                  magic.overwrite(
                    index,
                    index + placeholder.length,
                    jsesc(`/${fileName}`, { quotes: 'double' }),
                  )
                  const replaced = magic.toString()
                  chunk.code = replaced
                  if (chunk.map) chunk.map = magic.generateMap()
                }
            }
        }
      },
    },
  ]
}
