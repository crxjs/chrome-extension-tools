import { existsSync, outputFile } from 'fs-extra'
import { performance } from 'perf_hooks'
import {
  ChangeEvent,
  OutputBundle,
  OutputOptions,
  Plugin as RollupPlugin,
  RollupOptions,
  RollupWatcher,
  watch as rollupWatch,
} from 'rollup'
import {
  BehaviorSubject,
  delay,
  filter,
  firstValueFrom,
  map,
  Subject,
} from 'rxjs'
import { ResolvedConfig } from 'vite'
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

const serverConfig$ = new Subject<ResolvedConfig>()
const triggerName = firstValueFrom(
  serverConfig$.pipe(
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

export const pluginFileWriter =
  (crxPlugins: CrxPlugin[]): CrxPluginFn =>
  () => {
    let watcher: RollupWatcher
    return {
      name: pluginName,
      apply: 'serve',
      configureServer(server) {
        server.httpServer?.once('listening', async () => {
          serverConfig$.next(server.config)

          const { outDir } = server.config.build
          const { port } = server.config.server

          if (typeof port === 'undefined')
            throw new TypeError('vite serve port is undefined')

          for (const p of server.config.plugins as CrxPlugin[]) {
            const debug = _debug(p.name)
            try {
              await p.fileWriterStart?.({ port, outDir }, server)
            } catch (error) {
              debug('fileWriterStart error %O', error)
            }
          }

          let start = performance.now()
          /**
           * This plugin emits build events so other plugins can track the file
           * writer state.
           *
           * It only runs during development inside the file writer Rollup watch instance.
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

          const pre: CrxPlugin[] = []
          const post: CrxPlugin[] = []
          const plugins: CrxPlugin[] = []
          for (const p of crxPlugins) {
            if (p.apply === 'serve') continue
            else if (p.enforce === 'pre') pre.push(p)
            else if (p.enforce === 'post') post.push(p)
            else plugins.push(p)
          }

          watcher = rollupWatch({
            input: '@crx/stub',
            context: 'this',
            output: {
              dir: server.config.build.outDir,
              format: 'es',
            },
            plugins: [
              ...pre,
              ...plugins,
              ...post,
              buildLifecycle,
            ] as RollupPlugin[],
          })
        })
      },
      closeBundle() {
        watcher?.close()
      },
    }
  }
