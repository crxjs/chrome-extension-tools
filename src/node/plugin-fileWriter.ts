import {
  Plugin as RollupPlugin,
  RollupWatcher,
  watch as rollupWatch,
} from 'rollup'
import { isTruthy } from './helpers'
import { pluginFileWriterChunks } from './plugin-fileWriter--chunks'
import {
  pluginFileWriterEvents,
  server$,
  writerEvent$,
} from './plugin-fileWriter--events'
import { pluginFileWriterHtml } from './plugin-fileWriter--pages'
import { pluginFileWriterPublic } from './plugin-fileWriter--public'
import { pluginFileWriterPolyfill } from './plugin-fileWriter--polyfill'
import { CrxPlugin, CrxPluginFn } from './types'
import { stubId } from './virtualFileIds'

export const pluginFileWriter =
  (crxPlugins: CrxPlugin[]): CrxPluginFn =>
  (options) => {
    const chunks = pluginFileWriterChunks(options)
    const html = pluginFileWriterHtml(options)
    const events = pluginFileWriterEvents(options)
    const publicDir = pluginFileWriterPublic(options)
    const polyfill = pluginFileWriterPolyfill(options)
    const internal = [chunks, html, events, publicDir, polyfill].flat()

    let watcher: RollupWatcher
    return {
      name: 'crx:file-writer',
      apply: 'serve',
      async config(_config, env) {
        let config = _config
        for (const p of internal) {
          const r = await p.config?.(config, env)
          config = r ?? config
        }
        return config
      },
      async configResolved(config) {
        await Promise.all(internal.map((p) => p.configResolved?.(config)))
      },
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
            polyfill,
            chunks,
            html,
            publicDir,
            ...post,
            events,
          ].flat()

          /* ------------ RUN FILEWRITERSTART HOOK ----------- */

          const allPlugins: CrxPlugin[] = [...server.config.plugins, ...plugins]
          await Promise.all(
            allPlugins.map(async (p) => {
              try {
                await p.fileWriterStart?.(server)
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

          watcher = rollupWatch({
            input: stubId,
            context: 'this',
            output: {
              dir: server.config.build.outDir,
              format: 'es',
            },
            plugins: plugins as RollupPlugin[],
            // treeshake screws up hmr vue exports, don't need it for development
            treeshake: false,
          })

          watcher.on('event', (event) => {
            if (event.code === 'ERROR') {
              const { message, parserError, stack, id, loc, code, frame } =
                event.error
              const error = parserError ?? new Error(message)
              if (parserError && message.startsWith('Unexpected token')) {
                const m = `Unexpected token in ${loc?.file ?? id}`
                error.message = [m, loc?.line, loc?.column]
                  .filter(isTruthy)
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
