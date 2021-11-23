import { HmrOptions, ViteDevServer } from 'vite'
import { isUndefined } from './helpers'
import { addToCspScriptSrc } from './plugin_helpers'
import { CrxPlugin } from './types'

/**
 * Configures the manifest and ViteDevServer for HMR
 */
export const configureViteServeHmr = (): CrxPlugin => {
  let server: ViteDevServer
  return {
    name: 'vite-serve-csp',
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

      const serverUrl = `http://localhost:${server.config.server.port}`
      addToCspScriptSrc(manifest, [serverUrl])

      return manifest
    },
  }
}
