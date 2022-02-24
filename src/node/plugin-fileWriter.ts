import * as lexer from 'es-module-lexer'
import { existsSync, outputFile } from 'fs-extra'
import MagicString from 'magic-string'
import { performance } from 'perf_hooks'
import colors from 'picocolors'
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
  skip,
  Subject,
} from 'rxjs'
import { createLogger, Logger, ResolvedConfig, ViteDevServer } from 'vite'
import { isPresent, isString, _debug } from './helpers'
import { join, parse, relative } from './path'
import { stubId } from './plugin-manifest'
import { CrxPlugin, CrxPluginFn } from './types'

// const cssLangs = `\\.(css|less|sass|scss|styl|stylus|pcss|postcss)($|\\?)`
// const cssLangRE = new RegExp(cssLangs)
// const isCSSLang = (id: string): boolean => cssLangRE.test(id)
const scriptRE = /\.[jt]sx?$/s
const isScript = (s: string) => !s.startsWith('crx:') || scriptRE.test(s)

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
  debug('watcher event %O', event.type)
  if (event.type === 'error') debug('watcher error %O', event.error)
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

function logFileWriterEvents({
  logger,
  server,
}: {
  logger: Logger
  server: ViteDevServer
}) {
  filesReady$.subscribe(() => {
    server.ws.send({
      type: 'custom',
      event: 'runtime-reload',
    })
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

export const pluginFileWriter =
  (crxPlugins: CrxPlugin[]): CrxPluginFn =>
  () => {
    let watcher: RollupWatcher
    return {
      name: pluginName,
      apply: 'serve',
      configureServer(server) {
        server.httpServer?.once('listening', async () => {
          // TODO: consider pushing the server, not just the config
          serverConfig$.next(server.config)
          // TODO: consider allowing this to restart with the server? rxjs magic
          logFileWriterEvents({
            logger: createLogger(server.config.logLevel, { prefix: '[crx]' }),
            server,
          })

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

          const devServerLoader: CrxPlugin = {
            name: `${pluginName}-dev-loader`,
            apply: 'build',
            async resolveId(source, importer) {
              if (this.meta.watchMode)
                if (source.includes('?import')) {
                  // TODO: split this out into own file writer plugin
                  // static asset, export default filename
                  return join(server.config.root, source.split('?')[0])
                } else if (source.startsWith('@crx/content-scripts')) {
                  // emitted chunk, set file name in generateBundle
                  return { id: source, external: true }
                } else if (source === '/@vite/client') {
                  // TODO: split this out into own file writer plugin
                  // virtual crx module, resolved by other plugin
                  return null
                } else if (importer) {
                  // imported script file, load though vite dev server
                  const info = this.getModuleInfo(importer)
                  const { pathname } = new URL(source, 'stub://stub')
                  const { dir, name } = parse(pathname)
                  if (info?.meta.isScript)
                    return {
                      id: `\0${join(dir, name + '.js')}`,
                      meta: { isScript: true, url: source },
                    }
                } else if (isScript(source)) {
                  // entry script file, load though vite dev server
                  const r = await this.resolve(source, importer, {
                    skipSelf: true,
                  })
                  if (!r) return null
                  const resolved = typeof r === 'string' ? r : r.id
                  const url = `/${relative(server.config.root, resolved)}`
                  const { dir, name } = parse(resolved)
                  return {
                    id: `\0${join(dir, name + '.js')}`,
                    meta: { isScript: true, url },
                  }
                }
            },
            async load(id) {
              if (this.meta.watchMode) {
                const info = this.getModuleInfo(id)
                if (info?.meta.isScript) {
                  const { url } = info.meta
                  const r = await server.transformRequest(url)
                  if (r === null)
                    throw new TypeError(`Unable to load "${url}" from server.`)
                  return { code: r.code, map: r.map }
                }
              }

              return null
            },
            async transform(code, id) {
              if (this.meta.watchMode) {
                const info = this.getModuleInfo(id)
                if (info?.meta.isScript) {
                  const [imports] = lexer.parse(code)
                  if (imports.length === 0) return null
                  const magic = new MagicString(code)
                  const refIds = new Set<string>()
                  for (const i of imports)
                    if (i.n) {
                      if (i.n.startsWith('/@fs')) {
                        continue // should go to vendor
                      } else if (i.n.includes('?import')) {
                        continue // is static asset
                      } else {
                        // break other files into own chunks
                        const refId = this.emitFile({
                          type: 'chunk',
                          id: i.n,
                          importer: id,
                        })
                        refIds.add(refId)
                        magic.overwrite(
                          i.s,
                          i.e,
                          `@crx/content-scripts/${refId}`,
                        )
                      }
                    }

                  return {
                    code: magic.toString(),
                    map: magic.generateMap(),
                    meta: { refIds },
                  }
                }
              }
            },
          }

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
            devServerLoader,
            ...post,
            buildLifecycle,
          ]

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

                watcherEvent$.next({ type: 'error', error })
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
          })

          watcher.on('event', (event) => {
            if (event.code === 'ERROR') {
              const { message, parserError, stack, id, loc } = event.error
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

              watcherEvent$.next({ type: 'error', error })
            }
          })
        })
      },
      closeBundle() {
        watcher?.close()
      },
    }
  }
