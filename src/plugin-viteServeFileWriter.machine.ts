import {
  EmittedFile,
  RollupOptions,
  RollupWatcherEvent,
} from 'rollup'
import { ViteDevServer } from 'vite'
import { createModel } from 'xstate/lib/model'
import { CrxPlugin } from './types'

export const pluginsHook = 'configResolved'
export const serverHook = 'configureServer'
export const optionsHook = 'buildStart'

interface Context {
  options?: RollupOptions
  plugins: CrxPlugin[]
  server?: ViteDevServer
}

export const getEmittedFileId = (file: EmittedFile): string =>
  file.type === 'asset'
    ? file.fileName ?? file.name ?? 'fake asset id'
    : file.id

const context: Context = {
  plugins: [],
}

export const model = createModel(context, {
  events: {
    HOOK_START: (hookName: keyof CrxPlugin, args: any[]) => ({
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

export const machine = model.createMachine({
  id: 'vite-serve-file-writer',
  context: model.initialContext,
  initial: 'configuring',
  on: { ERROR: { target: '#error', actions: 'handleError' } },
  states: {
    configuring: {
      on: {
        HOOK_START: [
          {
            cond: (context, { hookName }) =>
              hookName === pluginsHook,
            actions: model.assign({
              plugins: (context, { args: [{ plugins }] }) =>
                plugins,
            }),
          },
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
            target: '.waiting',
            actions: model.assign({
              server: (context, { args: [server] }) => server,
            }),
          },
        ],
        SERVER_READY: 'serving',
      },
      initial: 'starting',
      states: {
        starting: {},
        waiting: {
          invoke: { src: 'waitForServer' },
        },
      },
    },
    serving: {
      invoke: { src: 'rollupWatch' },
      initial: 'working',
      states: {
        working: {
          on: {
            BUNDLE_START: {
              actions: 'handleBundleStart',
            },
            BUNDLE_END: {
              actions: 'handleBundleEnd',
              target: 'ready',
            },
          },
        },
        ready: {
          on: {
            BUNDLE_START: {
              actions: 'handleBundleStart',
              target: 'working',
            },
          },
        },
      },
    },
    error: { id: 'error', type: 'final' },
  },
})
