import contentHmrClient from 'client/es/content-hmr-client.ts?client'
import workerDevLoader from 'client/es/worker-dev-loader.ts?client'
import workerProLoader from 'client/es/worker-pro-loader.ts?client'
import contentDevLoader from 'client/iife/content-dev-loader.ts?client'
import contentProLoader from 'client/iife/content-pro-loader.ts?client'
import { parse } from './path'
import type { CrxPluginFn } from './types'

const pluginName = 'crx:esm-format'
// const debug = _debug(pluginName)

export const pluginEsmFormat: CrxPluginFn = () => {
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
      if (manifest.background?.service_worker) {
        const { service_worker: f } = manifest.background
        const refId = this.emitFile({
          type: 'asset',
          // fileName b/c service worker must be at root of crx
          fileName: `service-worker-loader.${parse(f).name}.js`,
          source:
            this.meta.watchMode && typeof port === 'string'
              ? workerDevLoader.replace(/%PATH%/g, f).replace(/%PORT%/g, port)
              : workerProLoader.replace(/%PATH%/g, f),
        })

        manifest.background.service_worker = this.getFileName(refId)
        manifest.background.type = 'module'
      }

      let contentClientName: string | undefined
      if (this.meta.watchMode && manifest.content_scripts?.length) {
        const refId = this.emitFile({
          type: 'asset',
          name: 'content-script-client.js',
          source: contentHmrClient,
        })
        contentClientName = this.getFileName(refId)
      }

      manifest.content_scripts = manifest.content_scripts?.map(
        ({ js, ...rest }) => ({
          js: js?.map((f: string) => {
            const name = `content-script-loader.${parse(f).name}.js`
            const source =
              typeof port === 'string' && typeof contentClientName === 'string'
                ? contentDevLoader
                    .replace(/%PATH%/g, f)
                    .replace(/%PORT%/g, port)
                    .replace(/%CLIENT%/g, contentClientName)
                : contentProLoader.replace(/%PATH%/g, f)

            const refId = this.emitFile({
              type: 'asset',
              name,
              source,
            })
            return this.getFileName(refId)
          }),
          ...rest,
        }),
      )

      return manifest
    },
  }
}
