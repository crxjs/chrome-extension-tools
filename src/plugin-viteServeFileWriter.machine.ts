import { EmittedFile, RollupWatcherEvent } from 'rollup'
import { ViteDevServer } from 'vite'
import { createModel } from 'xstate/lib/model'
import { CrxPlugin } from './types'

export const pluginsHook = 'configResolved'
export const serverHook = 'configureServer'
export const optionsHook = 'buildStart'

interface Context {
  /** CrxPlugins to be shared between serve and Rollup watch */
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
    /** CrxPlugins to be shared between serve and Rollup watch */
    PLUGINS: (plugins: CrxPlugin[]) => ({ plugins }),
    SERVER: (server: ViteDevServer) => ({ server }),
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
        PLUGINS: {
          actions: model.assign({
            plugins: (context, { plugins }) => plugins,
          }),
        },
        SERVER: {
          target: '.waiting',
          actions: model.assign({
            server: (context, { server }) => server,
          }),
        },
        SERVER_READY: 'watching',
      },
      initial: 'starting',
      states: {
        starting: {},
        waiting: {
          invoke: { src: 'waitForServer' },
        },
      },
    },
    watching: {
      invoke: { src: 'fileWriter' },
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
