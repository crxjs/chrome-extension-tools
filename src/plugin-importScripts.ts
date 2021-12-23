import { existsSync } from 'fs'
import jsesc from 'jsesc'
import MagicString from 'magic-string'
import { isChunk } from './helpers'
import { dirname, parse, relative, resolve } from './path'
import {
  generateFileNames,
  getRpceAPI,
  RpceApi,
  StubURL,
} from './plugin_helpers'
import { CrxPlugin } from './types'

const importScriptPrefix = '\0importedScript'

export const importScripts = (): CrxPlugin => {
  const fileImportRefIds = new Map<string, string>()
  let api: RpceApi

  return {
    name: 'import-scripts',
    enforce: 'pre',
    apply: 'build',
    buildStart({ plugins }) {
      if (plugins) api = getRpceAPI(plugins)!
    },
    resolveId(source, importer) {
      if (importer && source.includes('?script')) {
        const [preId, query] = source.split('?')
        const resolved = resolve(dirname(importer), preId)
        const id = parse(resolved).ext
          ? resolved
          : ['.ts', '.tsx', '.js', '.jsx', '.mjs']
              .map((x) => resolved + x)
              .find((x) => existsSync(x)) ?? resolved
        return importScriptPrefix + [id, query].join('?')
      }

      return null
    },
    async load(_id) {
      if (!_id.startsWith(importScriptPrefix)) return null

      const url = StubURL(_id.slice(importScriptPrefix.length))
      const id = url.pathname
      const fileName = generateFileNames(
        relative(api.root, id),
      ).outputFileName

      const files = await api.addFiles.call(this, [
        { id, fileName, fileType: 'CONTENT' },
      ])

      const { refId } = files.get(fileName)!
      fileImportRefIds.set(_id, refId)

      return `export default "%SCRIPT_${refId}%"`
    },
    generateBundle(options, bundle) {
      for (const chunk of Object.values(bundle)) {
        if (!isChunk(chunk)) continue

        for (const [id, refId] of fileImportRefIds) {
          if (!chunk.modules[id]) continue
          const fileName = this.getFileName(refId)
          // TODO: if chunk is manifest content script
          // - add fileName to webAccRes
          // - use same match pattern array
          const placeholder = `%SCRIPT_${refId}%`
          const index = chunk.code.indexOf(placeholder)
          const magic = new MagicString(chunk.code)
          magic.overwrite(
            index,
            index + placeholder.length,
            jsesc(fileName, { quotes: 'double' }),
          )
          const replaced = magic.toString()
          chunk.code = replaced
          if (chunk.map) chunk.map = magic.generateMap()
        }
      }
    },
  }
}
