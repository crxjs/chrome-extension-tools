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
import {
  narrowEvent,
  useConfig,
  waitForState,
} from './xstate_helpers'

/** The service is used by multiple exports */
const service = interpret(
  machine.withConfig({
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
              plugins: buildPlugins,
              build: { rollupOptions, watch: watchOptions },
            } = await resolveConfig(
              { configFile, build },
              'build',
              mode,
            )

            // replace build crx plugins with watch crx plugins
            const plugins = combinePlugins(
              (buildPlugins as CrxPlugin[]).filter(
                ({ crx }) => !crx,
              ),
              watchPlugins,
            )

            const watchRPCE = watchPlugins.find(isRPCE)!
            plugins.forEach((p, i) => {
              // Vite and Jest resolveConfig behavior is different
              // In Vite, the config module is imported twice as two different modules
              // In Jest, not only is the config module the same,
              //   the same plugin return value is used ¯\_(ツ)_/¯
              // So we need to check that RPCE is not the same object
              if (isRPCE(p) && watchRPCE !== p) {
                // replace build RPCE with watch RPCE
                ;(plugins as CrxPlugin[])[i] = watchRPCE
                // stop the build RPCE service
                p.api.service.stop()
              }
            })

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
                send(model.events.BUNDLE_END(event))
              } else if (event.code === 'BUNDLE_START') {
                send(model.events.BUNDLE_START(event))
              } else if (event.code === 'ERROR') {
                send(model.events.ERROR(event.error))
              }
            })
          })().catch((err) => send(model.events.ERROR(err)))

          return () => watcher?.close()
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
export function viteServeFileWriter(): CrxPlugin {
  let isViteServe: boolean

  return {
    name: 'vite-serve-file-writer',
    crx: true,
    enforce: 'pre',
    config(config, { command }) {
      isViteServe = command === 'serve'
    },
    configResolved(config) {
      if (!isViteServe) return

      useConfig(service, {
        actions: {
          handleBundleStart(context, _event) {
            narrowEvent(_event, 'BUNDLE_START')
            console.log('Building Chrome Extension files...')
          },
          handleBundleEnd(context, _event) {
            const { event } = narrowEvent(_event, 'BUNDLE_END')
            console.log(
              `Build completed in ${event.duration} ms`,
            )
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
            service.stop()
          },
        },
      })

      service.start()

      const watchPlugins: CrxPlugin[] = []
      config.plugins.forEach((servePlugin: CrxPlugin, i) => {
        if (isRPCE(servePlugin)) {
          // RPCE should only run in the inner Rollup Watch hooks
          watchPlugins.push(servePlugin)
          // RPCE should not run in ViteDevServer hooks
          ;(config.plugins as CrxPlugin[])[i] = {
            name: 'chrome-extension-replacement',
          }
          return
        }

        // Don't touch other non-crx plugins
        if (!servePlugin.crx) return

        // Shallow clone crx plugins for Rollup Watch
        // b/c we're going to remove some hooks from the originals
        const watchPlugin = { ...servePlugin }
        watchPlugins.push(watchPlugin)

        // These hooks should only run in watch mode for CRX plugins
        delete servePlugin.options
        delete servePlugin.buildStart
      })
      service.send(model.events.PLUGINS(watchPlugins))
    },
    configureServer(server) {
      if (!isViteServe) return

      if (service.initialized) {
        service.send(model.events.SERVER(server))
      }
    },
  }
}

/**
 * For use in tests. Resolves when file write operation is complete.
 */
export const filesReady = () =>
  waitForState(service, (state) => {
    if (state.event.type === 'ERROR') throw state.event.error
    return state.matches({ watching: 'ready' })
  })
