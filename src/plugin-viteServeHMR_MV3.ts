import cheerio from 'cheerio'
import { code as swCode } from 'code ./service-worker/code-fetchHandlerForMV3HMR.ts'
import getEtag from 'etag'
import MagicString from 'magic-string'
import { PluginContext } from 'rollup'
import { ViteDevServer } from 'vite'
import { model as filesModel } from './files.machine'
import { format, isUndefined } from './helpers'
import { runPlugins } from './index_runPlugins'
import { relative } from './path'
import { createStubURL, getRpceAPI } from './plugin_helpers'
import {
  Asset,
  AssetType,
  CrxPlugin,
  isMV3,
  StringAsset,
} from './types'

const fetchHandlerModule = 'crx-hmr-service-worker.js'

const mimeTypes: Record<
  Exclude<AssetType, 'MANIFEST' | 'IMAGE' | 'JSON' | 'RAW'>,
  string
> = {
  HTML: 'text/html' as const,
  CSS: 'text/css' as const,
}
const servedTypes = Object.keys(mimeTypes)

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
  const assetCache = new Map<string, Asset>()
  const crxPlugins: CrxPlugin[] = []

  let disablePlugin = true
  let server: ViteDevServer
  let api: ReturnType<typeof getRpceAPI>
  let swFilename: string | undefined

  return {
    name: 'vite-serve-hmr-mv3',
    crx: true,
    buildStart({ plugins }) {
      api = getRpceAPI(plugins)
      api?.service.onEvent((event) => {
        if (event.type === 'PLUGINS_RESULT') {
          const { type, ...asset } = event as Asset & {
            type: string
          }
          assetCache.set(`/${asset.fileName}`, asset)
        }
      })

      for (const plugin of plugins as CrxPlugin[]) {
        if (plugin.crx) crxPlugins.push(plugin)
      }
    },
    configureServer(s) {
      server = s

      useCrxFilesMiddleware(server, assetCache, crxPlugins)
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
    renderCrxHtml(source) {
      if (disablePlugin) return null
      const $ = cheerio.load(source)

      $('script[src]')
        .not('[data-rollup-asset]')
        .not('[src^="http:"]')
        .not('[src^="https:"]')
        .not('[src^="data:"]')
        .attr('type', 'module')
        .attr('src', (i, value) => {
          if (value.startsWith('/@')) return value
          const url = createStubURL(value)
          url.searchParams.set('t', Date.now().toString())
          return url.pathname + url.search
        })

      return $.html()
    },
    transform(code, id) {
      if (disablePlugin) return null
      if (id.endsWith(fetchHandlerModule)) return null

      if (isUndefined(swFilename)) {
        const files = Array.from(api!.emittedFiles.values())
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

function useCrxFilesMiddleware(
  server: ViteDevServer,
  assetCache: Map<string, Asset>,
  crxPlugins: CrxPlugin[],
) {
  server.middlewares.use(async (req, res, next) => {
    const url = createStubURL(req.url)
    const asset = assetCache.get(url.pathname)

    if (!asset || !servedTypes.includes(asset.fileType)) {
      next()
      return
    }

    if (res.writableEnded) {
      return
    }

    const result = (await runPlugins.call(
      new Proxy({} as PluginContext, {
        get() {
          throw new Error(
            format`CRX render hooks plugin context not implemented for ${servedTypes.join(
              ', ',
            )} in serve mode.
                Consider using a transformCrx hook or \`generateBundle\``,
          )
        },
      }),
      crxPlugins,
      asset,
      'render',
    )) as StringAsset

    const etag = getEtag(result.source, { weak: true })
    if (req.headers['if-none-match'] === etag) {
      res.statusCode = 304
      return res.end()
    }

    res.setHeader('Content-Type', mimeTypes[result.fileType])
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Etag', etag)
    res.setHeader('Access-Control-Allow-Origin', '*')

    res.statusCode = 200
    return res.end(result.source)
  })
}
