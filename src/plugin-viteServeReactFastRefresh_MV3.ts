import cheerio from 'cheerio'
import { code as swCode } from 'code ./service-worker/code-fetchHandlerForMV3HMR.ts'
import { createHash } from 'crypto'
import { ViteDevServer } from 'vite'
import { format } from './helpers'
import { CrxPlugin, isMV3 } from './types'

const fetchHandlerModule = 'rpce-sw-fetch-handler-for-hmr.js'
const inlineScriptPrefix = '__inlineScript'
/** Work with an id as a URL instance */
const createStubURL = (id: string) => {
  const pathnameAndSearch = id.startsWith('/') ? id : `/${id}`
  return new URL('stub://stub' + pathnameAndSearch)
}

/**
 * @vitejs/plugin-react adds a Fast Refresh prelude to HTML pages as an inline script.
 * The prelude must run before any React code. An inline script guarantees this.
 *
 * The Chrome Extension default CSP blocks inline script tags.
 *
 * In MV3, we can't add a hash to the CSP. Instead, we wrap all
 * JSX and TSX script tags with a dynamic import that delays until the prelude is done.
 * We add a script to the prelude that signals the other scripts when it is done.
 *
 * This will require users to observe a convention:
 *
 * All scripts that expect to use React Fast Refresh
 * must use the JSX or TSX extension.
 */
export const viteServeReactFastRefresh_MV3 = (): CrxPlugin => {
  let disablePlugin = true
  let server: ViteDevServer

  const scriptsByHash = new Map<string, string>()
  const hashesByScript = new Map<string, string>()

  return {
    name: 'configure-vite-serve-hmr-mv3',
    crx: true,
    configureServer(s) {
      server = s
    },
    transformCrxManifest(manifest) {
      disablePlugin = !isMV3(manifest) || !server
      return null
    },
    transformCrxHtml(source, { fileName: pageId }) {
      if (disablePlugin) return null

      const $ = cheerio.load(source)

      const $inlineScripts = $('script').not('[src]')
      const $remoteScripts = $('script[src]')
        .not('[data-rollup-asset]')
        .not('[src^="http:"]')
        .not('[src^="https:"]')
        .not('[src^="data:"]')

      if ($inlineScripts.length > 0)
        $remoteScripts.attr('src', (i, value) => {
          const url = createStubURL(value)
          url.searchParams.set('delay', 'true')
          const newSrc = url.pathname + url.search
          return newSrc
        })

      if ($inlineScripts.length > 1) {
        // TODO: warn that multiple inline script tags are not supported
        this.warn(format`
        An inline script tag was detected in ${pageId}.
        Chrome Extensions do not support inline script tags.
        An adaptor has been applied, but behavior may be unexpected.
        `)
      }

      // Find and convert inline script tags to remote script tags
      $inlineScripts.each((i, el) => {
        const $script = $(el)
        const inlineScript = $script.html()
        if (!inlineScript) return

        let hash = hashesByScript.get(inlineScript)
        if (!hash) {
          hash = createHash('sha1')
            .update(inlineScript)
            .digest('base64')
            .slice(0, 10)

          scriptsByHash.set(hash, inlineScript)
          hashesByScript.set(inlineScript, hash)
        }

        $script.attr('src', `/${inlineScriptPrefix}-${hash}.js`)
        $script.html('')
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
        return hash && scriptsByHash.get(hash)
      }
      return null
    },
  }
}
