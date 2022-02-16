import type { CrxPluginFn } from './types'

const pluginName = 'crx:background'
// const debug = _debug(pluginName)

export const pluginBackground: CrxPluginFn = () => {
  let port: string | undefined

  return {
    name: pluginName,
    apply: 'build',
    enforce: 'post',
    config(config) {
      const { build = {}, esbuild = {}, ...rest } = config
      if (esbuild === false) return null
      esbuild.target = 'esnext'
      build.target = 'esnext'
      return { ...rest, build }
    },
    fileWriterStart({ port: p }) {
      port = p.toString()
    },
    renderCrxManifest(manifest) {
      const worker = manifest.background?.service_worker

      /**
       * This plugin enables HMR during Vite serve mode by intercepting fetch
       * requests and routing them to the dev server.
       *
       * Service workers can only intercept requests inside their scope
       * (folder), so the service worker must be located at the root of the
       * Chrome Extension to handle all use cases.
       *
       * See https://stackoverflow.com/a/35780776/4842857 for more details.
       *
       * This module loader at the root of the Chrome Extension guarantees that
       * the background service worker will behave the same during development
       * and production.
       */
      let loader: string
      if (this.meta.watchMode) {
        if (typeof port === 'undefined')
          throw new Error('server port is undefined in watch mode')

        // development, required hmr client
        loader = `import 'http://localhost:${port}/@crx/worker-client';\n`
        // development, optional service worker
        if (worker) loader += `import 'http://localhost:${port}/${worker}';\n`
      } else if (worker) {
        // production w/ service worker
        loader = `import './${worker}';\n`
      } else {
        // production, no service worker, do nothing
        return manifest
      }

      const refId = this.emitFile({
        type: 'asset',
        // fileName b/c service worker must be at root of crx
        fileName: 'service-worker-loader.js',
        source: loader,
      })

      manifest.background = {
        service_worker: this.getFileName(refId),
        type: 'module',
      }

      return manifest
    },
  }
}
