import {
  EmittedFile,
  OutputOptions,
  RollupOptions,
  RollupWatcherEvent,
  RollupWatchOptions,
  watch,
} from 'rollup'
import { from } from 'rxjs'
import { Plugin as VitePlugin, ViteDevServer } from 'vite'
import { createModel } from 'xstate/lib/model'
import { format } from './helpers'
import { RPCEHooks, RPCEPlugin } from './types'
import { resolveFromServer } from './viteAdaptor_writeAsIIFE'

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
          const outputs: OutputOptions[] = [options?.output]
            .flat()
            .filter((x): x is OutputOptions => !!x)
            .map((x) => ({
              ...x,
              dir: server!.config.build.outDir,
              format: 'esm',
            }))

          const serverHooks: (keyof VitePlugin | symbol)[] = [
            'resolveId',
            'load',
            'transform',
            'buildEnd',
            'closeBundle',
          ]
          const rpceHooks: Record<keyof RPCEHooks, 0> = {
            renderCrxCss: 0,
            renderCrxHtml: 0,
            renderCrxImage: 0,
            renderCrxJson: 0,
            renderCrxManifest: 0,
            renderCrxRaw: 0,
            transformCrxCss: 0,
            transformCrxHtml: 0,
            transformCrxImage: 0,
            transformCrxJson: 0,
            transformCrxManifest: 0,
            transformCrxRaw: 0,
          }
          const excludedHooks = [
            ...serverHooks,
            ...Object.keys(rpceHooks),
          ]

          /**
           * Vite and RPCE both have duplicate sets of plugins
           * This set of plugin proxies will allow us to:
           *  - run only the build hooks in Rollup Watch, and
           *  - defer the other hooks to Vite or RPCE
           */
          const pluginProxies = Array.from(plugins).map(
            (p) =>
              new Proxy(p, {
                get(target, prop) {
                  if (excludedHooks.includes(prop))
                    return undefined

                  return Reflect.get(target, prop)
                },
              }),
          )

          const watchOptions: RollupWatchOptions = {
            ...options,
            output: {
              ...options?.output,
              dir: server!.config.build.outDir,
            },
            plugins: [
              resolveFromServer(server!),
              // @ts-expect-error Vite is using a different version of Rollup
              ...pluginProxies,
            ],
          }

          const watcher = watch(watchOptions)
          watcher.on('event', async (event) => {
            try {
              if (event.code === 'BUNDLE_END') {
                for (const output of outputs)
                  await event.result?.write(output)
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
