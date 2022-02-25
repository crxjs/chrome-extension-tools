import { ViteDevServer } from 'vite'
// import { _debug } from './helpers'
import { CrxPluginFn } from './types'

// const debug = _debug('file-writer').extend('assets')

export const pluginFileWriterAssets: CrxPluginFn = () => {
  let server: ViteDevServer
  return {
    name: `crx:file-writer-assets`,
    apply: 'build',
    enforce: 'pre',
    fileWriterStart(config, _server) {
      server = _server
    },
    async resolveId(source, importer) {
      if (this.meta.watchMode)
        if (importer && source.includes('?import')) {
          // TODO: copy asset to outdir
        }

      return null
    },
  }
}
