import { close, start } from './fileWriter'
import { CrxPluginFn } from './types'

/**
 * Integrates file writer with Vite.
 *
 * TODO: Convert file writer events to HMR payloads for content scripts.
 */
export const pluginFileWriter: CrxPluginFn = () => {
  return {
    name: 'crx:file-writer',
    apply: 'serve',
    configureServer(server) {
      return start({ server })
    },
    closeBundle() {
      return close()
    },
  }
}
