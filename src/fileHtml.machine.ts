import { createMachine } from 'xstate'
import { fileActions } from './file.actions'
import { createAssetModel, StringAsset } from './file.model'
import { stringFileAssigner } from './fileAssigners'
import { loadStringAsset } from './fileLoaders.services'

const context: StringAsset = {
  id: 'id placeholder',
  fileName: 'filename placeholder',
  source: 'source placeholder',
  manifestPath: 'manifest jsonpath placeholder',
  type: 'asset',
}
const model = createAssetModel(context)
export const htmlFile = createMachine<typeof model>(
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
          READY: { actions: 'assignFile', target: 'transform' },
        },
      },
      transform: {
        invoke: { src: 'runTransformHooks' },
        on: {
          READY: { actions: 'assignFile', target: 'parse' },
        },
      },
      parse: {
        invoke: { src: 'parseHtml' },
        on: {
          '*': { actions: 'forwardToParent' },
          ERROR: {
            actions: 'forwardToParent',
            target: '#error',
          },
          READY: 'render',
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
  },
  {
    actions: {
      ...fileActions,
      assignFile: model.assign(stringFileAssigner),
    },
    services: { loadStringAsset },
  },
)
