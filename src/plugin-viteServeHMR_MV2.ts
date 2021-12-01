import { HmrOptions, ViteDevServer } from 'vite'
import { isUndefined } from './helpers'
import { addToCspScriptSrc } from './plugin_helpers'
import { CrxPlugin, isMV3 } from './types'

/**
 * The Chrome Extension default CSP blocks remote code.
 * Vite's version of HMR relies on network requests and module caching.
 * We need to get our HTML scripts from localhost.
 *
 * In MV2, this is as simple as allowing localhost in the CSP.
 */
export const viteServeHMR_MV2 = (): CrxPlugin => {
  let server: ViteDevServer
  return {
    name: 'configure-vite-serve-hmr-mv2',
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
    renderCrxManifest(manifest) {
      if (isUndefined(server)) return manifest
      if (isMV3(manifest)) return null

      const serverUrl = `http://localhost:${server.config.server.port}`
      addToCspScriptSrc(manifest, [serverUrl])

      return manifest
    },
  }
}
