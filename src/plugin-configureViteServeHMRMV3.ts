import cheerio from 'cheerio'
import { code as swCode } from 'code ./service-worker/code-fetchHandlerForMV3HMR.ts'
import { code as inlineScriptCode } from 'code ./browser/code-inlineScriptDoneMessage.ts'
import MagicString from 'magic-string'
import { ViteDevServer } from 'vite'
import { isUndefined } from './helpers'
import { relative } from './path'
import { getRpceAPI } from './plugin_helpers'
import { CrxPlugin, isMV3 } from './types'
import { createHash } from 'crypto'

const fetchHandlerModule = '__sw-fetch-handler-for-hmr.js'
const inlineScriptPrefix = '__inlineScript'
/** Work with an id as a URL instance */
const createStubURL = (id: string) => {
  const pathnameAndSearch = id.startsWith('/') ? id : `/${id}`
  return new URL('stub://stub' + pathnameAndSearch)
}

/**
 * Adds support for MV3 HMR via a service worker fetch handler that does two things:
 * - circumvents the MV3 CSP to load HTML assets from localhost
 * - orchestrates script load timing to simulate inline scripts
 */
export const configureViteServeHMRMV3 = (): CrxPlugin => {
  let disablePlugin = true
  let server: ViteDevServer
  let api: ReturnType<typeof getRpceAPI>
  let swFilename: string | undefined

  const newScriptsByHash = new Map<string, string>()
  const hashesByOldScript = new Map<string, string>()

  return {
    name: 'configure-vite-serve-hmr-mv3',
    crx: true,
    buildStart({ plugins }) {
      api = getRpceAPI(plugins)
    },
    configureServer(s) {
      server = s
    },
    transformCrxManifest(manifest) {
      // QUESTION: does this run after configureServer?
      disablePlugin = !(isMV3(manifest) && server)

      if (disablePlugin) return null

      manifest.background = manifest.background ?? {
        service_worker: fetchHandlerModule,
        type: 'module',
      }

      return manifest
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
    transformCrxHtml(source, { fileName: pageId }) {
      if (disablePlugin) return null

      const messageSenderCode = inlineScriptCode.replace(
        /%PAGE_ID%/g,
        JSON.stringify(pageId),
      )

      const $ = cheerio.load(source)
      const $inlineScripts = $('script').not('[src]')

      // Find and convert inline script tags to remote script tags
      $inlineScripts.each((i, el) => {
        const $script = $(el)
        const inlineScript = $script.html()
        if (!inlineScript) return

        let hash = hashesByOldScript.get(inlineScript)
        if (!hash) {
          const newScript = [
            inlineScript,
            messageSenderCode,
          ].join('\n\n')

          hash = createHash('sha1')
            .update(newScript)
            .digest('base64')
            .slice(0, 10)

          newScriptsByHash.set(hash, newScript)
          hashesByOldScript.set(inlineScript, hash)
        }

        const srcUrl = createStubURL(inlineScriptPrefix)
        srcUrl.searchParams.set('inline', pageId)
        srcUrl.searchParams.set('hash', hash!)

        const newSrc = srcUrl.pathname + srcUrl.search
        $script.attr('src', newSrc)
        $script.html('')
      })

      const $remoteScripts = $('script[src]')
        .not('[data-rollup-asset]')
        .not('[src^="http:"]')
        .not('[src^="https:"]')
        .not('[src^="data:"]')

      $remoteScripts.attr('type', 'module')

      // Add delay search param to other script src's
      // The SW will delay the network response
      // until the inline scripts are done
      if ($inlineScripts.length > 0)
        $remoteScripts.attr('src', (i, value) => {
          const url = createStubURL(value)
          url.searchParams.set('delay', pageId)
          const newSrc = url.pathname + url.search
          return newSrc
        })

      return $.html()
    },
    resolveId(source) {
      if (disablePlugin) return null
      if (source.endsWith(fetchHandlerModule))
        return fetchHandlerModule
      if (source.startsWith(inlineScriptPrefix)) return source
      return null
    },
    load(id) {
      if (disablePlugin) return null
      if (id === fetchHandlerModule)
        return swCode.replace(
          /%VITE_SERVE_PORT%/,
          server.config.server.port!.toString(),
        )
      if (id.startsWith(inlineScriptPrefix)) {
        const url = createStubURL(id)
        const hash = url.searchParams.get('hash')
        return hash && newScriptsByHash.get(hash)
      }
      return null
    },
  }
}
