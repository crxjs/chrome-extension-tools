import { readFile } from 'fs-extra'
import { from } from 'rxjs'
import { assign, createMachine, sendParent } from 'xstate'
import { createAssetModel, RawAsset } from './file.model'
import { narrowEvent } from './helpers-xstate'

const context = {} as RawAsset
const model = createAssetModel(context)
export const rawFile = createMachine<typeof model>(
  {
    context: model.initialContext,
    on: {
      ERROR: { actions: 'forwardToParent', target: '#error' },
    },
    initial: 'load',
    states: {
      load: {
        invoke: { src: 'loadRawAsset' },
        on: {
          READY: { actions: 'assignFile', target: 'transform' },
        },
      },
      transform: {
        invoke: { src: 'runTransformHooks' },
        on: {
          READY: { actions: 'assignFile', target: 'render' },
        },
      },
      render: {
        invoke: { src: 'runRenderHooks' },
        on: {
          READY: { actions: 'assignFile', target: 'write' },
        },
      },
      write: {
        invoke: { src: 'emitFile', onDone: 'watch' },
      },
      watch: {
        invoke: { src: 'watchFile' },
        on: { START: 'write' },
      },
      error: {
        id: 'error',
        entry: 'forwardToParent',
        type: 'final',
      },
    },
  },
  {
    actions: {
      assignFile: assign((context, event) => {
        const { file } = narrowEvent(event, 'READY')
        return { ...context, ...file }
      }),
      forwardToParent: sendParent((context, event) => event),
    },
    services: {
      loadRawAsset: ({ id, ...rest }) =>
        from(
          readFile(id)
            .then((source) =>
              model.events.READY({
                id,
                ...rest,
                source,
              }),
            )
            .catch(model.events.ERROR),
        ),
    },
  },
)
