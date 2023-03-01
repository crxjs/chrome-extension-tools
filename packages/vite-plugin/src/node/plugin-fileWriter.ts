import { close, start } from './fileWriter'
import { fileWriterError$ } from './fileWriter-rxjs'
import { CrxPluginFn } from './types'
import { createLogger } from 'vite'
import { outputFiles } from './fileWriter-filesMap'
import fsx from 'fs-extra'

const { remove } = fsx

const logger = createLogger('error', { prefix: 'crxjs' })

/** Integrates file writer with Vite. */
export const pluginFileWriter: CrxPluginFn = () => {
  fileWriterError$.subscribe((error) => {
    logger.error(error.err.message, { error: error.err })
  })

  return [
    {
      name: 'crx:file-writer-empty-out-dir',
      apply: 'serve',
      enforce: 'pre',
      async configResolved(config) {
        if (config.build.emptyOutDir) {
          await remove(config.build.outDir)
        }
      },
    },
    {
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
      closeBundle() {
        outputFiles.clear()
      },
    },
  ]
}
