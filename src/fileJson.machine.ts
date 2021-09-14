import { createMachine } from 'xstate'
import { loadJsonAsset } from './fileLoaders.services'
import { createAssetModel, JsonAsset } from './file.model'

const context: JsonAsset = {
  id: 'id placeholder',
  fileName: 'filename placeholder',
  jsonData: {},
  manifestPath: 'manifest jsonpath placeholder',
  type: 'asset',
}
const model = createAssetModel(context)
export const jsonFile = createMachine<typeof model>({
  context: model.initialContext,
  on: {
    ERROR: { actions: 'forwardToParent', target: '#error' },
  },
  initial: 'load',
  states: {
    load: {
      invoke: { src: loadJsonAsset },
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
      invoke: { src: 'emitFile' },
      on: { READY: 'watch' },
    },
    watch: {
      invoke: { src: 'watchFile' },
      on: { START: 'write' },
    },
    error: { id: 'error', entry: 'logError', type: 'final' },
  },
})
