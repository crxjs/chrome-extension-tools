import CSP from 'csp-dev'
import { set } from 'lodash'
import { ViteDevServer } from 'vite'
import { isUndefined } from './helpers'
import { isMV2, CrxPlugin } from './types'

const defaultSrc = ['self']

function addViteServerToScriptSrc(
  serverUrl: string,
  csp?: string,
): string | undefined {
  const parser = new CSP(csp)
  const scriptSrc =
    parser.share('json')['script-src'] ?? defaultSrc
  const objectSrc =
    parser.share('json')['object-src'] ?? defaultSrc

  parser.newDirective('script-src', [...scriptSrc, serverUrl])
  parser.newDirective('object-src', objectSrc)

  return parser.share('string')
}

export const viteServeCsp = (): CrxPlugin => {
  let server: ViteDevServer | undefined
  return {
    name: 'vite-serve-csp',
    crx: true,
    configureServer(s) {
      server = s
    },
    renderCrxManifest(manifest) {
      const { port } = server?.config.server ?? {}
      if (isUndefined(port)) return manifest

      const serverUrl = `http://localhost:${port}`
      if (isMV2(manifest)) {
        set(
          manifest,
          'content_security_policy',
          addViteServerToScriptSrc(
            serverUrl,
            manifest.content_security_policy,
          ),
        )
      } else {
        set(
          manifest,
          'content_security_policy.extension_pages',
          addViteServerToScriptSrc(
            serverUrl,
            manifest.content_security_policy?.extension_pages,
          ),
        )
      }

      return manifest
    },
  }
}
