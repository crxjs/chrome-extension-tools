import { existsSync } from 'fs'
import jsesc from 'jsesc'
import MagicString from 'magic-string'
import { isChunk } from './helpers'
import { dirname, parse, relative, resolve } from './path'
import {
  generateFileNames,
  getRpceAPI,
  RpceApi,
  stubUrl,
} from './plugin_helpers'
import { CrxPlugin, EmittedFile } from './types'

export const importedResourcePrefix = 'importedResource'
export const resolvedResourcePrefix = `\0${importedResourcePrefix}`

export const importedResources = (): CrxPlugin => {
  const emittedResources = new Map<string, EmittedFile>()
  let api: RpceApi

  return {
    name: 'imported-resources',
    enforce: 'pre',
    apply: 'build',
    buildStart({ plugins }) {
      if (plugins) api = getRpceAPI(plugins)
    },
    resolveId(source, importer) {
      if (!importer) return null
      if (source.includes('?script')) {
        const [preId, query] = source.split('?')
        const resolved = resolve(dirname(importer), preId)
        const id = parse(resolved).ext
          ? resolved
          : ['.ts', '.tsx', '.js', '.jsx', '.mjs']
              .map((x) => resolved + x)
              .find((x) => existsSync(x)) ?? resolved
        return importedResourcePrefix + [id, query].join('?')
      } else if (source.endsWith('.html')) {
        const resolved = resolve(dirname(importer), source)
        return importedResourcePrefix + resolved + '?html'
      }

      return null
    },
    async load(_id) {
      if (!_id.startsWith(importedResourcePrefix)) return null

      const url = stubUrl(
        _id.slice(importedResourcePrefix.length),
      )
      const id = url.pathname
      const relpath = relative(api.root, id)
      const isHtml = url.searchParams.has('html')
      const fileName = isHtml
        ? relpath
        : generateFileNames(relpath).outputFileName

      const files = await api.addFiles.call(
        this,
        [
          {
            id,
            fileName,
            fileType: isHtml ? 'HTML' : 'SCRIPT_DYNAMIC',
          },
        ],
        'build',
      )

      const file = files.get(fileName)!
      emittedResources.set(_id, file)

      return `export default "%CRX_RESOURCE_${file.refId}%"`
    },
    generateBundle(options, bundle) {
      for (const chunk of Object.values(bundle)) {
        if (!isChunk(chunk)) continue

        for (const [id, { refId }] of emittedResources) {
          if (!chunk.modules[id]) continue
          const fileName = this.getFileName(refId)
          const placeholder = `%CRX_RESOURCE_${refId}%`
          const index = chunk.code.indexOf(placeholder)
          const magic = new MagicString(chunk.code)
          // Overwrite placeholder with filename
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

export const viteServeImportScripts = (): CrxPlugin => {
  let api: RpceApi

  return {
    name: 'vite-serve-import-scripts',
    enforce: 'pre',
    apply: 'serve',
    configResolved({ plugins }) {
      if (plugins) api = getRpceAPI(plugins)
    },
    resolveId(source, importer) {
      if (!importer || source.includes(importedResourcePrefix))
        return null

      if (source.includes('?script')) {
        const [preId, query] = source.split('?')
        const resolved = resolve(dirname(importer), preId)
        const id = parse(resolved).ext
          ? resolved
          : ['.ts', '.tsx', '.js', '.jsx', '.mjs']
              .map((x) => resolved + x)
              .find((x) => existsSync(x)) ?? resolved
        return resolvedResourcePrefix + [id, query].join('?')
      } else if (source.endsWith('.html')) {
        const resolved = resolve(dirname(importer), source)
        return resolvedResourcePrefix + resolved + '?html'
      }

      return null
    },
    async load(_id) {
      if (!_id.startsWith(resolvedResourcePrefix)) return null

      const url = stubUrl(
        _id.slice(resolvedResourcePrefix.length),
      )
      const id = url.pathname
      const relpath = relative(api.root, id)
      const isHtml = url.searchParams.has('html')
      const fileName = isHtml
        ? relpath
        : generateFileNames(relpath).outputFileName

      const files = await api.addFiles.call(
        this,
        [
          {
            id,
            fileName,
            fileType: isHtml ? 'HTML' : 'SCRIPT_DYNAMIC',
          },
        ],
        'serve',
      )

      // TODO: could probably combine build and serve plugins
      // - if wrapperName is defined, it's vite serve (no generateBundle)
      // - otherwise, generateBundle will take care of the wrapper name
      const { wrapperName } = files.get(fileName)!
      return `export default "${wrapperName ?? fileName}"`
    },
  }
}
