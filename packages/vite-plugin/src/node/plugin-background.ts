import workerHmrClient from 'client/es/hmr-client-worker.ts'
import { ResolvedConfig } from 'vite'
import { defineClientValues } from './defineClientValues'
import { getFileName } from './fileWriter-utilities'
import { ChromeManifestBackground, FirefoxManifestBackground } from './manifest'
import { getOptions } from './plugin-optionsProvider'
import type { Browser, CrxPluginFn } from './types'
import { workerClientId } from './virtualFileIds'

/**
 * This plugin enables HMR during Vite serve mode by intercepting fetch requests
 * and routing them to the dev server.
 *
 * Service workers can only intercept requests inside their scope (folder), so
 * the service worker must be located at the root of the Chrome Extension to
 * handle all use cases.
 *
 * See https://stackoverflow.com/a/35780776/4842857 for more details.
 *
 * This code places a module loader at the root of the Chrome Extension to
 * guarantee that the background service worker will behave the same during
 * development and production.
 */
export const pluginBackground: CrxPluginFn = () => {
  let config: ResolvedConfig
  let browser: Browser

  return [
    {
      name: 'crx:background-client',
      apply: 'serve',
      resolveId(source) {
        if (source === `/${workerClientId}`) return workerClientId
      },
      load(id) {
        if (id === workerClientId) {
          const base = `${config.server.https ? 'https' : 'http'}://localhost:${config.server.port}/`
          return defineClientValues(
            workerHmrClient.replace('__BASE__', JSON.stringify(base)),
            config,
          )
        }
      },
    },
    {
      name: 'crx:background-loader-file',
      // this should happen after other plugins; the loader file is an implementation detail
      enforce: 'post',
      async config(config) {
        const opts = await getOptions(config)
        browser = opts.browser || 'chrome'
      },
      configResolved(_config) {
        config = _config
      },
      renderCrxManifest(manifest) {
        const worker =
          browser === 'firefox'
            ? (manifest.background as FirefoxManifestBackground)?.scripts[0]
            : (manifest.background as ChromeManifestBackground)?.service_worker

        let loader: string
        if (config.command === 'serve') {
          const proto = config.server.https ? 'https' : 'http';
          const port = config.server.port?.toString()
          if (typeof port === 'undefined')
            throw new Error('server port is undefined in watch mode')

          if (browser === 'firefox') {
            // in FF, our "service worker" is actually a background page so we
            // can't use import statements

            // development, required to define env vars
            loader = `import('${proto}://localhost:${port}/@vite/env');\n`
            // development, required hmr client
            loader += `import('${proto}://localhost:${port}${workerClientId}');\n`
            // development, optional service worker
            if (worker)
              loader += `import('${proto}://localhost:${port}/${worker}');\n`
          } else {
            // development, required to define env vars
            loader = `import '${proto}://localhost:${port}/@vite/env';\n`
            // development, required hmr client
            loader += `import '${proto}://localhost:${port}${workerClientId}';\n`
            // development, optional service worker
            if (worker)
              loader += `import '${proto}://localhost:${port}/${worker}';\n`
          }
        } else if (worker) {
          // production w/ service worker loader at root, see comment at top of file.
          loader = `import './${worker}';\n`
        } else {
          // production w/o service worker, do nothing & early return
          return null
        }

        const refId = this.emitFile({
          type: 'asset',
          // fileName b/c service worker must be at root of crx
          fileName: getFileName({ type: 'loader', id: 'service-worker' }),
          source: loader,
        })

        if (browser !== 'firefox') {
          manifest.background = {
            service_worker: this.getFileName(refId),
            type: 'module',
          }
        } else {
          manifest.background = {
            scripts: [this.getFileName(refId)],
            type: 'module',
          }
        }

        return manifest
      },
    },
  ]
}
