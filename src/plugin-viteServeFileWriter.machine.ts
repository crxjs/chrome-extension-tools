import { EmittedFile, RollupWatcherEvent } from 'rollup'
import { ViteDevServer } from 'vite'
import { assign } from 'xstate'
import { createModel } from 'xstate/lib/model'
import { CrxPlugin } from './types'
import { narrowEvent } from './xstate_helpers'

export const pluginsHook = 'configResolved'
export const serverHook = 'configureServer'
export const optionsHook = 'buildStart'

export interface FileWriterContext {
  /** CrxPlugins to be shared between serve and Rollup watch */
  plugins: CrxPlugin[]
  server?: ViteDevServer
  lastError?: Error | null
}

export const getEmittedFileId = (file: EmittedFile): string =>
  file.type === 'asset'
    ? file.fileName ?? file.name ?? 'fake asset id'
    : file.id

const context: FileWriterContext = {
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

export const machine = model.createMachine(
  {
    id: 'vite-serve-file-writer',
    context: model.initialContext,
    initial: 'configuring',
    on: {
      ERROR: {
        target: '#error',
        actions: ['handleFatalError', 'assignLastError'],
      },
    },
    states: {
      error: { id: 'error', type: 'final' },
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
        on: {
          ERROR: { target: '.error', actions: 'handleError' },
        },
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
          error: {
            entry: 'assignLastError',
            exit: assign({ lastError: null }),
            on: {
              BUNDLE_START: {
                actions: 'handleBundleStart',
                target: 'working',
              },
            },
          },
        },
      },
    },
  },
  {
    actions: {
      assignLastError: assign({
        lastError: (context, event) =>
          narrowEvent(event, 'ERROR').error,
      }),
    },
  },
)
