import CSP from 'csp-dev'
import { set } from 'lodash'
import { HmrOptions } from 'vite'
import { isUndefined } from './helpers'
import { CrxPlugin, isMV2 } from './types'

const defaultSrc = ['self']

function addUrlToScriptSrc(
  url: string,
  csp?: string,
): string | undefined {
  const parser = new CSP(csp)
  const scriptSrc =
    parser.share('json')['script-src'] ?? defaultSrc
  const objectSrc =
    parser.share('json')['object-src'] ?? defaultSrc

  parser.newDirective('script-src', [...scriptSrc, url])
  parser.newDirective('object-src', objectSrc)

  return parser.share('string')
}

/**
 * Configures the manifest and ViteDevServer for HMR
 */
export const configureViteServeHmr = (): CrxPlugin => {
  let serverPort: number | undefined
  return {
    name: 'vite-serve-csp',
    crx: true,
    configureServer(server) {
      const { hmr, port } = server.config.server
      serverPort = port

      // Set host to localhost for HMR websocket
      // (default is CRX origin, which ofc doesn't work)
      const hmrConfig: HmrOptions =
        typeof hmr === 'boolean' || !hmr ? {} : hmr
      hmrConfig.host = hmrConfig.host ?? 'localhost'
      server.config.server.hmr = hmrConfig
    },
    renderCrxManifest(manifest) {
      if (isUndefined(serverPort)) return manifest

      const serverUrl = `http://localhost:${serverPort}`
      if (isMV2(manifest)) {
        set(
          manifest,
          'content_security_policy',
          addUrlToScriptSrc(
            serverUrl,
            manifest.content_security_policy,
          ),
        )
      } else {
        set(
          manifest,
          'content_security_policy.extension_pages',
          addUrlToScriptSrc(
            serverUrl,
            manifest.content_security_policy?.extension_pages,
          ),
        )
      }

      return manifest
    },
  }
}
