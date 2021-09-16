import { readJSON } from 'fs-extra'
import { from } from 'rxjs'
import { createMachine, sendParent } from 'xstate'
import { createAssetModel, JsonAsset } from './file.model'
import { narrowEvent } from './helpers-xstate'

const context = {} as JsonAsset
const model = createAssetModel(context)
export const jsonFile = createMachine<typeof model>(
  {
    context: model.initialContext,
    on: {
      ERROR: { actions: 'forwardToParent', target: '#error' },
    },
    initial: 'load',
    states: {
      load: {
        invoke: { src: 'loadJsonAsset' },
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
          READY: {
            actions: 'forwardToParent',
            target: 'complete',
          },
        },
      },
      complete: {
        on: {
          CHANGE: [
            {
              cond: ({ id }, { id: changedId }) =>
                id === changedId,
              target: 'load',
            },
            'render',
          ],
        },
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
      assignFile: (context, event) => {
        const { file } = narrowEvent(event, 'READY')
        return { ...context, ...file }
      },
      forwardToParent: sendParent((context, event) => event),
    },
    services: {
      // TODO: support alternate file formats (use cosmiconfig?)
      loadJsonAsset: ({ id, ...rest }) =>
        from(
          readJSON(id)
            .then((jsonData) =>
              model.events.READY({
                id,
                ...rest,
                jsonData,
              }),
            )
            .catch(model.events.ERROR),
        ),
    },
  },
)
