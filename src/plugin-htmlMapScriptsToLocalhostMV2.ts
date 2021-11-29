import cheerio from 'cheerio'
import { ViteDevServer } from 'vite'
import { model as filesModel } from './files.machine'
import { isUndefined } from './helpers'
import { dirname, join, relative } from './path'
import { getRpceAPI } from './plugin_helpers'
import { CrxPlugin, isMV2 } from './types'

/**
 * Reroutes HTML script tags to localhost during Vite Serve.
 *
 * This is only useful for MV2 HMR, see this MV3 bug report:
 * https://bugs.chromium.org/p/chromium/issues/detail?id=1247690#c_ts1631117342
 */
export const htmlMapScriptsToLocalhostMV2 = (): CrxPlugin => {
  let disablePlugin: boolean
  let server: ViteDevServer | undefined
  let api: ReturnType<typeof getRpceAPI>

  return {
    name: 'html-map-scripts-to-localhost-MV2',
    crx: true,
    enforce: 'post',
    configureServer(s) {
      server = s
    },
    buildStart({ plugins = [] }) {
      api = getRpceAPI(plugins)
    },
    transformCrxManifest(manifest) {
      if (isMV2(manifest)) {
        // HTML script modules will be served, not emitted
        if (server)
          api?.service.send(
            filesModel.events.EXCLUDE_FILE_TYPE('MODULE'),
          )
      } else {
        disablePlugin = true
      }

      return null
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
