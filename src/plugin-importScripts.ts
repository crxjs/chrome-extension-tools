import { relative } from './path'
import { getRpceAPI, RpceApi } from './plugin_helpers'
import { CrxPlugin } from './types'

const importScriptPrefix = '__importedScript'

export const importScripts = (): CrxPlugin => {
  let api: RpceApi
  return {
    name: 'import-scripts',
    enforce: 'pre',
    configResolved({ plugins }) {
      api = getRpceAPI(plugins)!
    },
    buildStart({ plugins }) {
      if (plugins) api = getRpceAPI(plugins)!
    },
    resolveId(source, importer) {
      if (importer && source.includes('?script'))
        return [importScriptPrefix, source].join('##')
      return null
    },
    async load(id) {
      if (!id.startsWith(importScriptPrefix)) return null

      const [fileId] = id.split('##')[1].split('?')
      const fileName = relative(api.root, fileId)
      const refId = this.emitFile({
        id: fileId,
        fileName,
        type: 'chunk',
      })

      return `export default import.meta.ROLLUP_FILE_URL_${refId}`
    },
  }
}
