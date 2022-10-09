import { close, start } from './fileWriter'
import { fileWriterError$ } from './fileWriter-rxjs'
import { CrxPluginFn } from './types'
import { createLogger } from 'vite'

const logger = createLogger('error', { prefix: 'crxjs' })

/**
 * Integrates file writer with Vite.
 *
 * TODO: Convert file writer events to HMR payloads for content scripts.
 */
export const pluginFileWriter: CrxPluginFn = () => {
  fileWriterError$.subscribe((error) => {
    logger.error(error.err.message, { error: error.err })
  })

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
