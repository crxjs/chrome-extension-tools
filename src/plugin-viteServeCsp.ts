import CSP from 'csp-dev'
import { set } from 'lodash'
import { isMV2, RPCEPlugin } from './types'
import { VITE_SERVER_URL } from './viteAdaptor.machine'

const defaultScriptSrc = ['self']

function addViteServerToScriptSrc(
  csp?: string,
): string | undefined {
  const parser = new CSP(csp)
  const scriptSrc =
    parser.share('json')['script-src'] ?? defaultScriptSrc
  parser.newDirective('script-src', [
    ...scriptSrc,
    VITE_SERVER_URL,
  ])
  return parser.share('string')
}

export const viteServeCsp = (): RPCEPlugin => {
  let isViteServe = false
  return {
    name: 'vite-serve-csp',
    configureServer() {
      isViteServe = true
    },
    renderCrxManifest(manifest) {
      if (!isViteServe) return manifest

      if (isMV2(manifest)) {
        set(
          manifest,
          'content_security_policy',
          addViteServerToScriptSrc(
            manifest.content_security_policy,
          ),
        )
      } else {
        set(
          manifest,
          'content_security_policy.extension_pages',
          addViteServerToScriptSrc(
            manifest.content_security_policy?.extension_pages,
          ),
        )
      }

      return manifest
    },
  }
}
