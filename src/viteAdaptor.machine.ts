import {
  EmittedFile,
  RollupOptions,
  RollupWatcherEvent,
  watch,
} from 'rollup'
import { from } from 'rxjs'
import { ViteDevServer } from 'vite'
import { createModel } from 'xstate/lib/model'
import { format } from './helpers'
import { RPCEPlugin } from './types'
import {
  createPluginProxy,
  resolveFromServer,
} from './viteAdaptor_rollupWatch'

export const configHook = 'config'
export const serverHook = 'configureServer'
export const optionsHook = 'buildStart'

interface Context {
  options?: RollupOptions
  plugins: Set<RPCEPlugin>
  server?: ViteDevServer
}

export const getEmittedFileId = (file: EmittedFile): string =>
  file.type === 'asset'
    ? file.fileName ?? file.name ?? 'fake asset id'
    : file.id

const context: Context = {
  plugins: new Set(),
}

export const model = createModel(context, {
  events: {
    ADD_PLUGIN: (plugin: RPCEPlugin) => ({ plugin }),
    HOOK_START: (hookName: keyof RPCEPlugin, args: any[]) => ({
      hookName,
      args,
    }),
    SERVER_READY: () => ({}),
    BUNDLE_START: (
      event: Extract<
        RollupWatcherEvent,
        { code: 'BUNDLE_START' }
      >,
    ) => ({ event }),
    BUNDLE_END: (
      event: Extract<RollupWatcherEvent, { code: 'BUNDLE_END' }>,
    ) => ({ event }),
    ERROR: (error: any, id?: string) => ({ id, error }),
  },
})

export const viteAdaptorMachine = model.createMachine(
  {
    id: 'vite-adaptor',
    context: model.initialContext,
    initial: 'starting',
    on: { ERROR: '#error' },
    states: {
      starting: {
        on: {
          ADD_PLUGIN: {
            actions: model.assign({
              plugins: ({ plugins }, { plugin }) =>
                new Set(plugins).add(plugin),
            }),
          },
          HOOK_START: [
            {
              cond: (context, { hookName, args }) =>
                // is vite serve
                hookName === configHook &&
                args[1]?.command === 'serve',
              target: 'configuring',
            },
            {
              cond: (context, { hookName, args }) =>
                // is vite build
                hookName === configHook &&
                args[1]?.command === 'build',
              target: 'building',
            },
            {
              cond: (context, { hookName }) =>
                // is rollup
                hookName !== configHook,
              target: 'building',
            },
          ],
        },
      },
      configuring: {
        on: {
          HOOK_START: [
            {
              cond: (context, { hookName }) =>
                hookName === optionsHook,
              actions: model.assign({
                options: ({ options }, { args: [opts] }) =>
                  options ?? opts,
              }),
            },
            {
              cond: (context, { hookName }) =>
                hookName === serverHook,
              target: '.initializing',
              actions: model.assign({
                server: (context, { args: [server] }) => server,
              }),
            },
          ],
          SERVER_READY: 'serving',
        },
        initial: 'start',
        states: {
          start: {},
          initializing: {
            invoke: { src: 'waitForServer' },
          },
        },
      },
      serving: {
        invoke: { src: 'rollupWatch' },
        initial: 'working',
        states: {
          working: {
            on: { BUNDLE_END: 'ready' },
          },
          ready: {
            on: { BUNDLE_START: 'working' },
          },
        },
      },
      building: { type: 'final' },
      error: { id: 'error', type: 'final' },
    },
  },
  {
    services: {
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
      rollupWatch:
        ({ options, plugins, server }) =>
        (send) => {
          const watcher = watch({
            ...options,
            output: {
              ...options?.output,
              dir: server!.config.build.outDir,
            },
            plugins: [
              resolveFromServer(server!),
              // @ts-expect-error Vite is using a different version of Rollup
              ...Array.from(plugins)
                // No errors here ;)
                .map(createPluginProxy),
            ],
          })

          watcher.on('event', async (event) => {
            try {
              if (event.code === 'BUNDLE_END') {
                await event.result?.close()
                send(model.events.BUNDLE_END(event))
              } else if (event.code === 'BUNDLE_START') {
                send(model.events.BUNDLE_START(event))
              } else if (event.code === 'ERROR') {
                await event.result?.close()
                const { error } = event
                if (
                  error.message?.includes('is not exported by')
                ) {
                  // TODO: add documentation with example
                  const message = format`Could not complete bundle because Vite did not pre-bundle a dependency.
                      You may need to add this dependency to your Vite config under \`optimizeDeps.include\`.
                      Original Error: ${error.message}`
                  throw new Error(message)
                } else throw error
              }
            } catch (error) {
              send(model.events.ERROR(error))
            }
          })

          return () => watcher.close()
        },
    },
  },
)
