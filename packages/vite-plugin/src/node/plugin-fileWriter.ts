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
      server.httpServer?.on('listening', async () => {
        try {
          await start({ server })
        } catch (error) {
          console.error(error)
          server.close()
        }
      })
      server.httpServer?.on('close', () => close())
    },
  }
}
