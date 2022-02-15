import workerDevLoader from 'client/es/worker-dev-loader.ts?client'
import workerProLoader from 'client/es/worker-pro-loader.ts?client'
import { parse } from './path'
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
      if (manifest.background?.service_worker) {
        const { service_worker: f } = manifest.background
        const refId = this.emitFile({
          type: 'asset',
          // fileName b/c service worker must be at root of crx
          fileName: `service-worker-loader.${parse(f).name}.js`,
          source: this.meta.watchMode
            ? workerDevLoader.replace(/%PATH%/g, f).replace(/%PORT%/g, port!)
            : workerProLoader.replace(/%PATH%/g, f),
        })

        manifest.background.service_worker = this.getFileName(refId)
        manifest.background.type = 'module'
      }

      return manifest
    },
  }
}
