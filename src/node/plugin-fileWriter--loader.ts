import { ViteDevServer } from 'vite'
import { _debug } from './helpers'
import { CrxPluginFn } from './types'

const debug = _debug('file-writer').extend('loader')

const scriptRE = /\.[jt]sx?$/s
const isScript = (s: string) => scriptRE.test(s)

export const pluginDevServerLoader: CrxPluginFn = () => {
  let server: ViteDevServer
  return {
    name: `crx:file-writer-loader`,
    apply: 'build',
    fileWriterStart(config, _server) {
      server = _server
    },
    async resolveId(source, importer) {
      if (this.meta.watchMode)
        if (importer) {
          // imported script file, load though vite dev server
          const { pathname } = new URL(source, 'stub://stub')
          const id = pathname.endsWith('.js') ? pathname : `\0${pathname}.js`
          return { id, meta: { url: source } }
        } else if (isScript(source)) {
          // entry script file, load though vite dev server
          const resolved = await this.resolve(source, importer, {
            skipSelf: true,
          })
          if (!resolved) return null
          const { pathname } = new URL(resolved.id, 'stub://stub')
          const id = pathname.endsWith('.js') ? pathname : `\0${pathname}.js`
          return { id, meta: { url: pathname } }
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
          debug('start "%s"', url)
          debug('---------------------')
          for (const l of r.code.split('\n')) debug('| %s', l)
          debug('---------------------')
          debug('end "%s"', url)
          return { code: r.code, map: r.map }
        }
      }

      return null
    },
  }
}
