import { existsSync, readFile } from 'fs-extra'
import { GetManualChunk, PreRenderedChunk } from 'rollup'
import { ViteDevServer } from 'vite'
import { fileById, idByUrl, setFileMeta, urlById } from './fileMeta'
import { isString } from './helpers'
import { relative } from './path'
import { crxDynamicNamespace } from './plugin-dynamicScripts'
import { CrxPluginFn } from './types'

// const debug = _debug('file-writer').extend('chunks')

const scriptRE = /\.[jt]sx?$/s
const isScript = (s: string) => scriptRE.test(s)
/** Server.transformRequest doesn't work with /@id/ urls */
const cleanUrl = (url: string) => url.replace(/^\/@id\//, '')

function urlToFileName(source: string) {
  const url = new URL(source.replace(':', '.'), 'stub://stub')
  let ext = 'js'
  if (url.searchParams.has('vue')) {
    const type = url.searchParams.get('type')
    const index = url.searchParams.get('index')
    ext = [type, index, ext].filter(isString).join('.')
  }
  const fileName = `${url.pathname.slice(1)}.${ext}`
  return fileName
}

export const pluginFileWriterChunks: CrxPluginFn = () => {
  let server: ViteDevServer
  return {
    name: 'crx:file-writer-chunks',
    apply: 'build',
    fileWriterStart(_server) {
      server = _server
    },
    async resolveId(source, importer) {
      if (this.meta.watchMode)
        if (idByUrl.has(cleanUrl(source))) {
          return idByUrl.get(cleanUrl(source))!
        } else if (importer) {
          const url = cleanUrl(source)
          const fileName = urlToFileName(url)
          const id = `\0${fileName}`
          setFileMeta({ url, fileName, id })
          return id
        } else if (isScript(source)) {
          // entry script file, load though vite dev server
          const resolved = await this.resolve(source, importer, {
            skipSelf: true,
          })
          if (!resolved) return null
          const { pathname: url } = new URL(resolved.id, 'stub://stub')
          const fileName = `${relative(server.config.root, url)}.js`
          const id = `\0${fileName}`
          setFileMeta({ url, fileName, id })
          return id
        }
    },
    async load(id) {
      if (this.meta.watchMode && urlById.has(id)) {
        const url = urlById.get(id)!
        const r = await server.transformRequest(url)
        if (r === null)
          throw new TypeError(`Unable to load "${url}" from server.`)

        // debug('start "%s"', url)
        // debug('---------------------')
        // for (const l of r.code.split('\n')) debug('| %s', l)
        // debug('---------------------')
        // debug('end "%s"', url)

        const module = await server.moduleGraph.getModuleByUrl(url)
        if (module?.file && existsSync(module.file)) {
          this.addWatchFile(module.file)
          if (url.includes('?import'))
            this.emitFile({
              type: 'asset',
              fileName: relative(server.config.root, module.file),
              source: await readFile(module.file),
            })
        }

        return { code: r.code, map: r.map }
      }

      return null
    },
    outputOptions({
      chunkFileNames = 'assets/[name].[hash].js',
      entryFileNames = 'assets/[name].[hash].js',
      assetFileNames = 'assets/[name].[hash].[ext]',
      ...options
    }) {
      const crx = '@crx/'
      const rr = '@react-refresh'
      const manualChunks: GetManualChunk = (id: string) => {
        if (id.includes(crxDynamicNamespace)) return 'dynamic-scripts'
        if (id.includes(crx)) return id.slice(id.indexOf(crx) + crx.length)
        if (id.includes(rr)) return 'react-refresh'

        // TODO: use config.cacheDir
        if (id.includes('/.vite/')) {
          return 'vendor'
        }
        if (fileById.has(id)) return fileById.get(id)!
        return null
      }

      const fileNames = (chunk: PreRenderedChunk): string | undefined => {
        const ids = Object.keys(chunk.modules)
        if (ids.length === 1 && fileById.has(ids[0])) {
          if (ids[0].includes(rr)) return undefined
          return fileById.get(ids[0])!
        }
      }

      return {
        ...options,
        assetFileNames,
        chunkFileNames: (c) =>
          fileNames(c) ??
          (typeof chunkFileNames === 'string'
            ? chunkFileNames
            : chunkFileNames(c)),
        entryFileNames: (c) =>
          fileNames(c) ??
          (typeof entryFileNames === 'string'
            ? entryFileNames
            : entryFileNames(c)),
        manualChunks,
      }
    },
  }
}
