import workerHmrClient from 'client/es/hmr-client-worker.ts'
import { ResolvedConfig } from 'vite'
import { defineClientValues } from './defineClientValues'
import { getFileName } from './fileWriter-utilities'
import type { CrxPluginFn } from './types'
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

  return [
    {
      name: 'crx:background-client',
      apply: 'serve',
      resolveId(source) {
        if (source === `/${workerClientId}`) return workerClientId
      },
      load(id) {
        if (id === workerClientId) {
          const base = `http://localhost:${config.server.port}/`
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
      configResolved(_config) {
        config = _config
      },
      renderCrxManifest(manifest) {
        const worker = manifest.background?.service_worker

        let loader: string
        if (config.command === 'serve') {
          const port = config.server.port?.toString()
          if (typeof port === 'undefined')
            throw new Error('server port is undefined in watch mode')

          // development, required to define env vars
          loader = `import 'http://localhost:${port}/@vite/env';\n`
          // development, required hmr client
          loader += `import 'http://localhost:${port}${workerClientId}';\n`
          // development, optional service worker
          if (worker) loader += `import 'http://localhost:${port}/${worker}';\n`
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

        manifest.background = {
          service_worker: this.getFileName(refId),
          type: 'module',
        }

        return manifest
      },
    },
  ]
}
