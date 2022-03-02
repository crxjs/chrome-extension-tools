import { existsSync, readFile } from 'fs-extra'
import { PreRenderedChunk } from 'rollup'
import { ViteDevServer } from 'vite'
import { isString } from './helpers'
import { relative } from './path'
import { crxDynamicNamespace } from './plugin-dynamicScripts'
import { CrxPluginFn } from './types'

// const debug = _debug('file-writer').extend('chunks')

const scriptRE = /\.[jt]sx?$/s
const isScript = (s: string) => scriptRE.test(s)
/** Server.transformRequest doesn't work with /@id/ urls */
const cleanUrl = (url: string) => url.replace(/^\/@id\//, '')

export const pluginFileWriterChunks: CrxPluginFn = () => {
  const fileById = new Map<string, string>()
  let server: ViteDevServer
  return {
    name: 'crx:file-writer-chunks',
    apply: 'build',
    fileWriterStart(config, _server) {
      server = _server
    },
    async resolveId(source, importer) {
      if (this.meta.watchMode)
        if (importer) {
          const clean = cleanUrl(source)
          // imported script file, load though vite dev server
          const url = new URL(clean, 'stub://stub')
          let ext = 'js'
          if (url.searchParams.has('vue')) {
            const type = url.searchParams.get('type')
            const index = url.searchParams.get('index')
            ext = [type, index, ext].filter(isString).join('.')
          }
          const id = `\0${url.pathname}.${ext}`
          return { id, meta: { url: clean } }
        } else if (isScript(source)) {
          // entry script file, load though vite dev server
          const resolved = await this.resolve(source, importer, {
            skipSelf: true,
          })
          if (!resolved) return null
          const { pathname } = new URL(resolved.id, 'stub://stub')
          return { id: `\0${pathname}.js`, meta: { url: pathname } }
        }
    },
    async load(id) {
      if (this.meta.watchMode) {
        const info = this.getModuleInfo(id)
        if (info?.meta.url) {
          const { url } = info.meta
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
            const fileName = relative(server.config.root, module.file)
            fileById.set(id, fileName)
            if (url.includes('?import'))
              this.emitFile({
                type: 'asset',
                fileName,
                source: await readFile(module.file),
              })
          }

          return { code: r.code, map: r.map }
        }
      }

      return null
    },
    outputOptions({
      chunkFileNames = 'assets/[name].[hash].js',
      entryFileNames = 'assets/[name].[hash].js',
      assetFileNames = 'assets/[name].[hash].[ext]',
      ...options
    }) {
      const manualChunks = (id: string): string => {
        if (id.includes('/.vite/')) {
          return 'vendor'
        } else if (id.includes(crxDynamicNamespace)) {
          return 'dynamic-scripts'
        } else {
          return id.slice(id.indexOf('@') + 1)
        }
      }
      const fileNames = (chunk: PreRenderedChunk): string | undefined => {
        const [id, ...rest] = Object.keys(chunk.modules)
        if (fileById.has(id) && rest.length === 0) {
          return `${fileById.get(id)!}.js`
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
