import cheerio from 'cheerio'
import { code as swCode } from 'code ./service-worker/code-fetchHandlerForMV3HMR.ts'
import MagicString from 'magic-string'
import { ViteDevServer } from 'vite'
import { model as filesModel } from './files.machine'
import { isUndefined } from './helpers'
import { relative } from './path'
import { getRpceAPI } from './plugin_helpers'
import { CrxPlugin, isMV3 } from './types'

const fetchHandlerModule = 'crx-hmr-service-worker.js'

/**
 * The Chrome Extension default CSP blocks remote code.
 * Vite's version of HMR relies on network requests and module caching.
 * We need to get our HTML scripts from localhost.
 *
 * Officially, MV3 allows us to relax the CSP during development,
 * but due to a bug Chromium ignores the CSP in the manifest:
 * https://bugs.chromium.org/p/chromium/issues/detail?id=1247690#c_ts1631117342
 *
 * Strategy: A CSP isn't designed to defend against yourself, only outside actors.
 * We can use the MV3 service worker to circumvent the MV3 CSP using a fetch handler.
 */
export const viteServeHMR_MV3 = (): CrxPlugin => {
  let disablePlugin = true
  let server: ViteDevServer
  let api: ReturnType<typeof getRpceAPI>
  let swFilename: string | undefined

  return {
    name: 'vite-serve-hmr-mv3',
    crx: true,
    buildStart({ plugins }) {
      api = getRpceAPI(plugins)
    },
    configureServer(s) {
      server = s
    },
    transformCrxManifest(manifest) {
      disablePlugin = !(isMV3(manifest) && server)

      if (disablePlugin) return null

      manifest.background = manifest.background ?? {
        service_worker: fetchHandlerModule,
        type: 'module',
      }

      api?.service.send(
        filesModel.events.EXCLUDE_FILE_TYPE('MODULE'),
      )

      return manifest
    },
    transformCrxHtml(source) {
      const $ = cheerio.load(source)

      $('script[src]')
        .not('[data-rollup-asset]')
        .not('[src^="http:"]')
        .not('[src^="https:"]')
        .not('[src^="data:"]')
        .attr('type', 'module')

      return $.html()
    },
    transform(code, id) {
      if (disablePlugin) return null
      if (id.endsWith(fetchHandlerModule)) return null

      if (isUndefined(swFilename)) {
        const files = Array.from(api!.files.values())
        const { id } = files.find(
          ({ fileType }) => fileType === 'BACKGROUND',
        )!
        swFilename = id && relative(api!.root, id)
      }

      if (id.endsWith(swFilename!)) {
        const magic = new MagicString(code)
        magic.prepend(`import "${fetchHandlerModule}";\n`)
        return {
          code: magic.toString(),
          map: magic.generateMap(),
        }
      }

      return null
    },
    resolveId(source) {
      if (disablePlugin) return null
      if (source.endsWith(fetchHandlerModule))
        return fetchHandlerModule
      return null
    },
    load(id) {
      if (disablePlugin) return null
      if (id === fetchHandlerModule)
        return swCode.replace(
          /%VITE_SERVE_PORT%/,
          server.config.server.port!.toString(),
        )
      return null
    },
  }
}
