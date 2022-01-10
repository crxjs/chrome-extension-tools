import { existsSync } from 'fs'
import { dirname, parse, relative, resolve } from './path'
import { prefix, resolvedPrefix } from './plugin-importScripts'
import {
  generateFileNames,
  getRpceAPI,
  RpceApi,
  StubURL,
} from './plugin_helpers'
import { CrxPlugin } from './types'

export const viteServeImportScripts = (): CrxPlugin => {
  let api: RpceApi

  return {
    name: 'vite-serve-import-scripts',
    enforce: 'pre',
    apply: 'serve',
    configResolved({ plugins }) {
      if (plugins) api = getRpceAPI(plugins)!
    },
    resolveId(source, importer) {
      if (
        importer &&
        source.includes('?script') &&
        !source.includes(prefix)
      ) {
        const [preId, query] = source.split('?')
        const resolved = resolve(dirname(importer), preId)
        const id = parse(resolved).ext
          ? resolved
          : ['.ts', '.tsx', '.js', '.jsx', '.mjs']
              .map((x) => resolved + x)
              .find((x) => existsSync(x)) ?? resolved
        return resolvedPrefix + [id, query].join('?')
      }

      return null
    },
    async load(_id) {
      if (!_id.startsWith(resolvedPrefix)) return null

      const url = StubURL(_id.slice(resolvedPrefix.length))
      const id = url.pathname
      const fileName = generateFileNames(
        relative(api.root, id),
      ).outputFileName

      await api.addFiles.call(
        this,
        [{ id, fileName, fileType: 'CONTENT' }],
        'serve',
      )

      return `export default "${fileName}"`
    },
  }
}
