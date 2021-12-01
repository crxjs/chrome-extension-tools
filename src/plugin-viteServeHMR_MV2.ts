import { HmrOptions, ViteDevServer } from 'vite'
import { model as filesModel } from './files.machine'
import { isUndefined } from './helpers'
import { dirname, join, relative } from './path'
import {
  addToCspScriptSrc,
  getRpceAPI,
  RpceApi,
} from './plugin_helpers'
import { CrxPlugin, isMV2 } from './types'
import cheerio from 'cheerio'

/**
 * The Chrome Extension default CSP blocks remote code.
 * Vite's version of HMR relies on network requests and module caching.
 * We need to get our HTML scripts from localhost.
 *
 * In MV2, this is as simple as allowing localhost in the CSP.
 */
export const viteServeHMR_MV2 = (): CrxPlugin => {
  let disablePlugin = true
  let server: ViteDevServer
  let api: RpceApi | undefined
  return {
    name: 'vite-serve-hmr-mv2',
    crx: true,
    configureServer(s) {
      server = s
      const { hmr } = s.config.server

      // Set host to localhost for HMR websocket
      // (default is CRX origin, which ofc doesn't work)
      const hmrConfig: HmrOptions =
        typeof hmr === 'boolean' || !hmr ? {} : hmr
      hmrConfig.host = hmrConfig.host ?? 'localhost'
      s.config.server.hmr = hmrConfig
    },
    buildStart({ plugins = [] }) {
      api = getRpceAPI(plugins)
    },
    transformCrxManifest(manifest) {
      disablePlugin = !isMV2(manifest) || !server
      if (disablePlugin) return null

      api?.service.send(
        filesModel.events.EXCLUDE_FILE_TYPE('MODULE'),
      )

      return null
    },
    renderCrxManifest(manifest) {
      if (disablePlugin) return null

      const serverUrl = `http://localhost:${server.config.server.port}`
      addToCspScriptSrc(manifest, [serverUrl])

      return manifest
    },
    renderCrxHtml(source, { id }) {
      const { port } = server?.config.server ?? {}
      if (disablePlugin || isUndefined(port)) return null

      const relPath = relative(api!.root, id)
      const relDir = dirname(relPath)
      const $ = cheerio.load(source)

      $('script[src]')
        .not('[data-rollup-asset]')
        .not('[src^="http:"]')
        .not('[src^="https:"]')
        .not('[src^="data:"]')
        .attr('type', 'module')
        .attr('src', (i, value) => {
          const url = new URL(`http://localhost:${port}`)
          url.pathname =
            relDir === '.' ? value : join(relDir, value)
          return url.href
        })

      return $.html()
    },
  }
}
