import { createMachine } from 'xstate'
import { fileActions } from './file.actions'
import { createAssetModel, RawAsset } from './file.model'
import { rawFileAssigner } from './fileAssigners'
import { loadRawAsset } from './fileLoaders.services'

const context: RawAsset = {
  id: 'id placeholder',
  fileName: 'filename placeholder',
  source: new Uint8Array(),
  manifestPath: 'manifest jsonpath placeholder',
  type: 'asset',
}
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
      error: { id: 'error', entry: 'logError', type: 'final' },
    },
  },
  {
    actions: {
      ...fileActions,
      assignFile: model.assign(rawFileAssigner),
    },
    services: { loadRawAsset },
  },
)
