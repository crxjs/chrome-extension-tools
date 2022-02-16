import { existsSync, outputFile } from 'fs-extra'
import type {
  ChangeEvent,
  OutputBundle,
  OutputOptions,
  RollupOptions,
  RollupWatcher,
} from 'rollup'
import {
  BehaviorSubject,
  delay,
  filter,
  firstValueFrom,
  map,
  Subject,
} from 'rxjs'
import { build, ResolvedConfig } from 'vite'
import { isString, _debug } from './helpers'
import { join } from './path'
import { CrxPlugin, CrxPluginFn } from './types'

const pluginName = 'crx:file-writer'
const debug = _debug(pluginName)

type FileWriterEvent =
  | { type: 'init' }
  | {
      type: 'buildStart'
      options: RollupOptions
    }
  | {
      type: 'writeBundle'
      options: OutputOptions
      bundle: OutputBundle
      duration: number
    }
  | {
      type: 'error'
      error: Error | undefined
    }
  | { type: 'change'; id: string; event: ChangeEvent }

const watcherEvent$ = new BehaviorSubject<FileWriterEvent>({
  type: 'init',
})

watcherEvent$.subscribe((event) => {
  return debug('watcher event %O', event.type)
})

export const filesStart$ = watcherEvent$.pipe(
  filter((x): x is Extract<FileWriterEvent, { type: 'buildStart' }> => {
    return x.type === 'buildStart'
  }),
)

export const filesStart = () => firstValueFrom(filesStart$)

export const filesReady$ = watcherEvent$.pipe(
  filter((x): x is Extract<FileWriterEvent, { type: 'writeBundle' }> => {
    return x.type === 'writeBundle'
  }),
  delay(200), // TODO: make this dynamic - check that written files exist and have been updated
)

export const filesReady = () => firstValueFrom(filesReady$)

const viteConfig$ = new Subject<ResolvedConfig>()
const triggerName = firstValueFrom(
  viteConfig$.pipe(
    map(({ cacheDir }) => cacheDir),
    filter(isString),
    map((dir) => join(dir, '.crx-watch-trigger')),
  ),
)

/** Trigger a rebuild from other plugins */
export const rebuildFiles = async (): Promise<void> => {
  await filesReady()
  await Promise.all([
    outputFile(await triggerName, Date.now().toString()),
    filesStart(),
  ])
  await filesReady()
}

export const pluginFileWriter: CrxPluginFn = () => {
  let _watcher: RollupWatcher
  const fileWriterPlugin: CrxPlugin = {
    name: pluginName,
    apply: 'serve',
    configureServer(server) {
      server.httpServer?.once('listening', async () => {
        viteConfig$.next(server.config)

        /**
         * This plugin runs the `fileWriterStart` plugin hooks during the
         * `configResolved` hook. It only runs during development inside the
         * file writer Rollup watch instance.
         */
        const hookRunner: CrxPlugin = {
          name: pluginName,
          enforce: 'pre',
          apply: 'build',
          async configResolved({ plugins }) {
            const { outDir } = server.config.build
            const { port } = server.config.server

            if (typeof port === 'undefined')
              throw new TypeError('vite serve port is undefined')

            for (const p of plugins as CrxPlugin[]) {
              const debug = _debug(p.name)
              try {
                await p.fileWriterStart?.({ port, outDir }, server)
              } catch (error) {
                debug('fileWriterStart error %O', error)
              }
            }
          },
        }

        let start = performance.now()
        /**
         * This plugin emits build events so other plugins can track the file
         * writer state. It only runs during development inside the file writer
         * Rollup watch instance.
         */
        const buildLifecycle: CrxPlugin = {
          name: 'crx:build-lifecycle',
          enforce: 'post',
          apply: 'build',
          async buildStart(options) {
            start = performance.now()
            const filename = await triggerName
            if (!existsSync(filename)) {
              await outputFile(filename, Date.now().toString())
            }
            this.addWatchFile(filename)
            watcherEvent$.next({ type: 'buildStart', options })
          },
          writeBundle(options, bundle) {
            const duration = Math.round(performance.now() - start)
            watcherEvent$.next({
              type: 'writeBundle',
              options,
              bundle,
              duration,
            })
          },
          renderError(error) {
            watcherEvent$.next({ type: 'error', error })
          },
          watchChange(id, { event }) {
            watcherEvent$.next({ type: 'change', id, event })
          },
        }

        const result = build({
          build: {
            outDir: server.config.build.outDir,
            rollupOptions: {
              context: 'this',
            },
            watch: {
              clearScreen: false,
            },
          },
          configFile: server.config.configFile,
          logLevel: 'warn',
          mode: server.config.mode,
          plugins: [hookRunner, buildLifecycle],
        })

        try {
          await result
        } catch (error) {
          watcherEvent$.error(error)

          const message = 'Could not start the file writer'
          if (error instanceof Error)
            server.config.logger.error(`${message}: ${error.message}
${error.stack}`)
          else if (typeof error === 'string')
            server.config.logger.error(`${message}: ${error}`)
          else
            server.config.logger.error(`${message}: ${JSON.stringify(error)}`)
        }
      })
    },
    closeBundle() {
      _watcher?.close()
    },
  }

  /**
   * When we start the file writer in Vite serve mode, we start an internal copy
   * of Vite build. If a plugin runs in both serve and build, same plugin object
   * may exist in both the serve and build plugin arrays. This is unexpected,
   * but has been demonstrated while debugging `@vitejs/plugin-react`. Sharing
   * plugins between two Vite instances is probably OK for most hooks, but
   * `configResolved` should never run 2x, since plugins may use it to detect
   * their environment. Serve settings should usually prevail.
   */
  let servePlugins: Set<CrxPlugin>
  const dedupePlugins: CrxPlugin = {
    name: 'crx:dedupe-plugins',
    enforce: 'pre',
    configResolved({ plugins, command }) {
      if (command === 'serve') {
        servePlugins = new Set(plugins)
      } else if (command === 'build' && servePlugins) {
        for (const p of plugins)
          if (servePlugins.has(p)) delete p['configResolved']
      }
    },
  }

  return [fileWriterPlugin, dedupePlugins]
}
