import { existsSync, outputFile } from 'fs-extra'
import { performance } from 'perf_hooks'
import colors from 'picocolors'
import { ChangeEvent, OutputBundle, OutputOptions, RollupOptions } from 'rollup'
import {
  BehaviorSubject,
  delay,
  filter,
  firstValueFrom,
  map,
  skip,
  Subject,
} from 'rxjs'
import { createLogger, ViteDevServer } from 'vite'
import { isString, _debug } from './helpers'
import { join, relative } from './path'
import { CrxPluginFn } from './types'

export const debug = _debug('file-writer')

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
      error?: Error
      code?: string
      frame?: string
    }
  | { type: 'change'; id: string; event: ChangeEvent }

export const writerEvent$ = new BehaviorSubject<FileWriterEvent>({
  type: 'init',
})

writerEvent$.subscribe((event) => {
  debug('watcher event %O', event.type)
  if (event.type === 'error') {
    debug('watcher error %O', event.error)
  }
})

export const filesStart$ = writerEvent$.pipe(
  filter((x): x is Extract<FileWriterEvent, { type: 'buildStart' }> => {
    return x.type === 'buildStart'
  }),
)

export const filesStart = () => firstValueFrom(filesStart$)

export const filesReady$ = writerEvent$.pipe(
  filter((x): x is Extract<FileWriterEvent, { type: 'writeBundle' }> => {
    return x.type === 'writeBundle'
  }),
  delay(200), // TODO: make this dynamic - check that written files exist and have been updated
)

export const filesReady = () => firstValueFrom(filesReady$)

export const server$ = new Subject<ViteDevServer>()
export const triggerName = firstValueFrom(
  server$.pipe(
    map(({ config: { cacheDir } }) => cacheDir),
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

function startFileWriterLogger(server: ViteDevServer) {
  const logger = createLogger(server.config.logLevel, {
    prefix: 'crx',
  })

  filesStart$.subscribe(() => {
    const message = colors.green('files start')
    const outDir = colors.dim(
      relative(server.config.root, server.config.build.outDir),
    )
    logger.info(`${message} ${outDir}`, { timestamp: true })
  })

  filesReady$.subscribe(({ duration: d }) => {
    const message = colors.green('files ready')
    const duration = colors.dim(`in ${colors.bold(`${d}ms`)}`)
    logger.info(`${message} ${duration}`, { timestamp: true })
  })

  filesReady$.pipe(skip(1)).subscribe(() => {
    logger.info('runtime reload', { timestamp: true })
  })
}

/**
 * This plugin emits build events so other plugins can track the file writer state.
 *
 * It only runs during development inside the file writer Rollup watch instance.
 */
export const pluginFileWriterEvents: CrxPluginFn = () => {
  let start = performance.now()
  return {
    name: 'crx:file-writer-events',
    enforce: 'post',
    apply: 'build',
    fileWriterStart(config, server) {
      startFileWriterLogger(server)
    },
    async buildStart(options) {
      start = performance.now()
      const filename = await triggerName
      if (!existsSync(filename)) {
        await outputFile(filename, Date.now().toString())
      }
      this.addWatchFile(filename)
      writerEvent$.next({ type: 'buildStart', options })
    },
    writeBundle(options, bundle) {
      const duration = Math.round(performance.now() - start)
      writerEvent$.next({
        type: 'writeBundle',
        options,
        bundle,
        duration,
      })
    },
    renderError(error) {
      writerEvent$.next({ type: 'error', error })
    },
    watchChange(id, { event }) {
      writerEvent$.next({ type: 'change', id, event })
    },
  }
}