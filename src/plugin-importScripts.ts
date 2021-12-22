import { existsSync } from 'fs'
import jsesc from 'jsesc'
import MagicString from 'magic-string'
import { OutputChunk } from 'rollup'
import { isChunk } from './helpers'
import { dirname, parse, resolve } from './path'
import { getRpceAPI, RpceApi, StubURL } from './plugin_helpers'
import { CrxPlugin } from './types'

const importScriptPrefix = '\0importedScript'

export const importScripts = (): CrxPlugin => {
  const textImportRefIds = new Map<string, string>()
  const fileImportRefIds = new Map<string, string>()
  let api: RpceApi

  return {
    name: 'import-scripts',
    enforce: 'pre',
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
    async load(id) {
      if (!id.startsWith(importScriptPrefix)) return null

      const url = StubURL(id.slice(importScriptPrefix.length))
      const refId = this.emitFile({
        id: url.pathname,
        type: 'chunk',
      })

      if (url.searchParams.has('text')) {
        textImportRefIds.set(id, refId)
        return `export default "%TEXT_${refId}%"`
      } else {
        fileImportRefIds.set(id, refId)
        return `export default "%FILE_${refId}%"`
      }
    },
    generateBundle(options, bundle) {
      for (const chunk of Object.values(bundle)) {
        if (!isChunk(chunk)) continue

        for (const [id, refId] of textImportRefIds) {
          if (!chunk.modules[id]) continue
          const fileName = this.getFileName(refId)
          const { code: text } = bundle[fileName] as OutputChunk
          const placeholder = `%TEXT_${refId}%`
          const index = chunk.code.indexOf(placeholder)
          const magic = new MagicString(chunk.code)
          magic.overwrite(
            index,
            index + placeholder.length,
            jsesc(text, { quotes: 'double' }),
          )
          const replaced = magic.toString()
          chunk.code = replaced
          if (chunk.map) chunk.map = magic.generateMap()
        }

        for (const [id, refId] of fileImportRefIds) {
          if (!chunk.modules[id]) continue
          const fileName = this.getFileName(refId)
          const placeholder = `%FILE_${refId}%`
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

      for (const [, refId] of textImportRefIds) {
        const fileName = this.getFileName(refId)
        delete bundle[fileName]
      }
    },
  }
}
