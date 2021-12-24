import {
  OutputOptions,
  Plugin,
  RollupWatcher,
  RollupWatchOptions,
  watch,
} from 'rollup'
import { from } from 'rxjs'
import { resolveConfig, ViteDevServer } from 'vite'
import { interpret } from 'xstate'
import { format } from './helpers'
import {
  machine,
  model,
} from './plugin-viteServeFileWriter.machine'
import { combinePlugins, isRPCE } from './plugin_helpers'
import { CrxPlugin } from './types'
import { narrowEvent, waitForState } from './xstate_helpers'

/** The service is used by multiple exports */
const service = interpret(
  machine.withConfig({
    actions: {
      handleBundleStart(context, _event) {
        narrowEvent(_event, 'BUNDLE_START')
        console.log('Building Chrome Extension files...')
      },
      handleBundleEnd(context, _event) {
        const { event } = narrowEvent(_event, 'BUNDLE_END')
        console.log(`Build completed in ${event.duration} ms`)
      },
      handleError(context, event) {
        const { error } = narrowEvent(event, 'ERROR')
        if (error.message?.includes('is not exported by')) {
          console.warn(format`Could not complete bundle because Vite did not pre-bundle a dependency.
          You may need to add this dependency to your Vite config under \`optimizeDeps.include\`.`)
        }

        console.error(error)
      },
      handleFatalError({ server }, event) {
        const { error } = narrowEvent(event, 'ERROR')
        console.error(error)
        server?.close()
        if (service.initialized) service.stop()
      },
    },
    services: {
      fileWriter:
        ({ plugins: watchPlugins, server }) =>
        (send) => {
          const {
            config: {
              configFile,
              mode,
              build: { terserOptions, ...build },
            },
          } = server!
          let watcher: RollupWatcher | undefined
          ;(async () => {
            // get build config
            console.log(
              `> Resolving CRX watch config from "${configFile}"`,
            )

            const {
              plugins: _buildPlugins,
              build: { rollupOptions, watch: watchOptions },
            } = await resolveConfig(
              { configFile, build },
              'build',
              mode,
            )

            const buildPlugins = (_buildPlugins as CrxPlugin[])
              .filter(
                (p) => !p.crx && p.name !== 'chrome-extension',
              )
              .concat({
                name: 'crx:file-writer-error-reporter',
                buildEnd(error) {
                  if (error) send(model.events.ERROR(error))
                },
              })

            const preAliasPlugins = buildPlugins.splice(
              0,
              buildPlugins.findIndex(
                ({ name }) => name === 'alias',
              ) + 1,
            )
            // replace build crx plugins with watch crx plugins
            const plugins = [
              ...preAliasPlugins,
              ...combinePlugins(watchPlugins, buildPlugins),
            ]

            const options: RollupWatchOptions = {
              ...rollupOptions,
              // The context should not be touched here
              // The hybrid output plugin will change it
              context: 'this',
              output: {
                ...(rollupOptions?.output as OutputOptions),
                dir: build.outDir,
              },
              plugins: plugins as Plugin[],
              watch: {
                ...watchOptions,
                chokidar: {
                  ignored: [
                    '**/node_modules/**',
                    '**/.git/**',
                    ...(watchOptions?.chokidar?.ignored || []),
                  ],
                  ignoreInitial: true,
                  ignorePermissionErrors: true,
                  ...watchOptions?.chokidar,
                },
              },
            }

            watcher = watch(options)
            watcher.on('event', async (event) => {
              if (event.code === 'BUNDLE_END') {
                ;(event.result as any).toJSON = () =>
                  'EventResult'
                send(model.events.BUNDLE_END(event))
              } else if (event.code === 'BUNDLE_START') {
                send(model.events.BUNDLE_START(event))
              } else if (event.code === 'ERROR') {
                send(model.events.ERROR(event.error))
              }
            })
          })().catch((err) => send(model.events.ERROR(err)))

          return () => {
            watcher?.close()
          }
        },
      waitForServer: ({ server }) =>
        from(
          new Promise<ViteDevServer>((resolve, reject) => {
            if (!server?.httpServer)
              reject(
                new Error(
                  `vite httpServer is ${typeof server?.httpServer}`,
                ),
              )

            server?.httpServer?.once('listening', resolve)
          })
            .then(model.events.SERVER_READY)
            .catch((error) =>
              model.events.ERROR(error, 'waitForServer'),
            ),
        ),
    },
  }),
  { devTools: true },
)

/**
 * Writes extension files during Vite serve.
 *
 * The Vite dev server doesn't write files to the disk,
 * which is a requirement for Chrome Extension development.
 *
 * This plugin uses an instance of Rollup Watch to
 * fulfill this requirement. We'll use a plugin to load
 * files from the dev server, and then write them to disk.
 * This keeps configuration consistent and simple.
 *
 * Since we're still using the Vite server to load files,
 * Vite will call certain hooks (resolveId, load, transform).
 * These hooks should be excluded from Rollup Watch
 * to avoid duplicate hook calls.
 */
export const viteServeFileWriter = (): CrxPlugin => {
  return {
    name: 'vite-serve-file-writer',
    crx: true,
    enforce: 'pre',
    apply: 'serve',
    configResolved(config) {
      const configPlugins = config.plugins as CrxPlugin[]
      const watchPlugins: CrxPlugin[] = []
      let rpceIndex = -1
      configPlugins.forEach((plugin: CrxPlugin, i) => {
        if (plugin.crx) {
          watchPlugins.push(plugin)
        } else if (isRPCE(plugin)) {
          watchPlugins.push(plugin)
          rpceIndex = i
        }
      })

      // RPCE should only run in the inner Rollup Watch hooks
      const { name, api } = configPlugins[rpceIndex]
      configPlugins[rpceIndex] = { name, api }

      service.start()
      service.send(model.events.PLUGINS(watchPlugins))
    },
    configureServer(server) {
      service.send(model.events.SERVER(server))
    },
  }
}

const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms))

/**
 * For use in tests. Resolves when file write operation is complete.
 */
export const filesReady = async () => {
  await waitForState(service, (state) => {
    if (state.matches({ watching: 'error' }))
      throw (
        state.context.lastError ||
        new TypeError(
          'file writer error, but lastError was unset',
        )
      )
    return state.matches({ watching: 'ready' })
  })

  // Allow time for fs to catch up
  await delay(50)
}

/**
 * For use in tests. Stops the file writer service.
 */
export const stopFileWriter = () => {
  if (service.initialized) service.stop()
}
