import {
  Plugin as RollupPlugin,
  RollupWatcher,
  watch as rollupWatch,
} from 'rollup'
import { isPresent } from './helpers'
import { pluginFileWriterChunks } from './plugin-fileWriter--chunks'
import {
  pluginFileWriterEvents,
  server$,
  writerEvent$,
} from './plugin-fileWriter--events'
import { pluginFileWriterHtml } from './plugin-fileWriter--pages'
import { stubId } from './plugin-manifest'
import { CrxPlugin, CrxPluginFn } from './types'

export const pluginFileWriter =
  (crxPlugins: CrxPlugin[]): CrxPluginFn =>
  (options) => {
    let watcher: RollupWatcher
    return {
      name: 'crx:file-writer',
      apply: 'serve',
      configureServer(server) {
        server.httpServer?.once('listening', async () => {
          server$.next(server)

          /* ------------------ SORT PLUGINS ----------------- */

          const pre: CrxPlugin[] = []
          const post: CrxPlugin[] = []
          const mid: CrxPlugin[] = []
          for (const p of crxPlugins) {
            if (p.apply === 'serve') continue
            else if (p.enforce === 'pre') pre.push(p)
            else if (p.enforce === 'post') post.push(p)
            else mid.push(p)
          }

          const plugins = [
            ...pre,
            ...mid,
            pluginFileWriterChunks(options),
            pluginFileWriterHtml(options),
            ...post,
            pluginFileWriterEvents(options),
          ].flat()

          /* ------------ RUN FILEWRITERSTART HOOK ----------- */

          const { outDir } = server.config.build
          const { port } = server.config.server

          if (typeof port === 'undefined')
            throw new TypeError('vite serve port is undefined')

          const allPlugins: CrxPlugin[] = [...server.config.plugins, ...plugins]
          await Promise.all(
            allPlugins.map(async (p) => {
              try {
                await p.fileWriterStart?.({ port, outDir }, server)
              } catch (e) {
                const hook = `[${p.name}].fileWriterStart`

                let error = new Error(`Error in plugin ${hook}`)
                if (e instanceof Error) {
                  error = e
                  error.message = `${hook} ${error.message}`
                } else if (typeof e === 'string') {
                  error = new Error(`${hook} ${e}`)
                }

                writerEvent$.next({ type: 'error', error })
              }
            }),
          )

          /* ------------- CREATE ROLLUP WATCHER ------------- */
          const { output = {} } = server.config.build.rollupOptions
          const { assetFileNames, chunkFileNames, entryFileNames } = [output]
            .flat()
            .pop()! // get first output

          watcher = rollupWatch({
            input: stubId,
            context: 'this',
            output: {
              dir: server.config.build.outDir,
              format: 'es',
              assetFileNames,
              chunkFileNames,
              entryFileNames,
            },
            plugins: plugins as RollupPlugin[],
          })

          watcher.on('event', (event) => {
            if (event.code === 'ERROR') {
              const { message, parserError, stack, id, loc, code, frame } =
                event.error
              const error = parserError ?? new Error(message)
              if (parserError && message.startsWith('Unexpected token')) {
                const m = `Unexpected token in ${loc?.file ?? id}`
                error.message = [m, loc?.line, loc?.column]
                  .filter(isPresent)
                  .join(':')
              }
              error.stack = (stack ?? error.stack)?.replace(
                /.+?\n/,
                `Error: ${error.message}\n`,
              )

              writerEvent$.next({ type: 'error', error, code, frame })
            }
          })
        })
      },
      closeBundle() {
        watcher?.close()
      },
    }
  }
