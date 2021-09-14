import { createMachine } from 'xstate'
import { stringFileAssigner } from './fileAssigners'
import { loadStringAsset } from './fileLoaders.services'
import { createAssetModel, StringAsset } from './file.model'
import { fileActions } from './file.actions'

const context: StringAsset = {
  id: 'id placeholder',
  fileName: 'filename placeholder',
  source: 'source placeholder',
  manifestPath: 'manifest jsonpath placeholder',
  type: 'asset',
}
const model = createAssetModel(context)
export const cssFile = createMachine<typeof model>(
  {
    context: model.initialContext,
    on: {
      ERROR: { actions: 'forwardToParent', target: '#error' },
    },
    initial: 'load',
    states: {
      load: {
        invoke: { src: 'loadStringAsset' },
        on: {
          READY: {
            actions: 'assignFile',
            target: 'transform',
          },
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
        invoke: { src: 'emitFile' },
        on: {
          READY: { actions: 'forwardToParent', target: 'watch' },
        },
      },
      watch: {
        invoke: { src: 'watchFile' },
        on: { START: 'write' },
      },
      error: { id: 'error', entry: 'logError', type: 'final' },
    },
  },
  {
    actions: {
      ...fileActions,
      assignFile: model.assign(stringFileAssigner),
    },
    services: { loadStringAsset },
  },
)
