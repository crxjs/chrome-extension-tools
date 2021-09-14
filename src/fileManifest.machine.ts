import { PackageJson } from 'type-fest'
import { createMachine } from 'xstate'
import { fileActions } from './file.actions'
import {
  createAssetModel,
  Manifest,
  ManifestAsset,
} from './file.model'
import { manifestFileAssigner } from './fileAssigners'
import {
  loadManifest,
  loadPackageJson,
} from './fileLoaders.services'

const context: ManifestAsset = {
  id: 'id placeholder',
  fileName: 'filename placeholder',
  jsonData: {} as Manifest,
  packageJson: {} as PackageJson,
  manifestPath: '$',
  type: 'asset',
}
const model = createAssetModel(context)
export const manifestFile = createMachine<typeof model>(
  {
    context: model.initialContext,
    on: {
      ERROR: { actions: 'forwardToParent', target: '#error' },
    },
    initial: 'load',
    states: {
      load: {
        type: 'parallel',
        onDone: 'transform',
        states: {
          manifest: {
            invoke: { src: 'loadManifest' },
            on: {
              READY: {
                actions: 'assignManifest',
                target: '.done',
              },
            },
            states: { done: { type: 'final' } },
          },
          package: {
            invoke: { src: loadPackageJson },
            on: {
              READY: {
                actions: 'assignPackageJson',
                target: '.done',
              },
            },
            states: { done: { type: 'final' } },
          },
        },
      },
      transform: {
        invoke: { src: 'runTransformHooks' },
        on: {
          READY: { actions: 'assignFile', target: 'parse' },
        },
      },
      parse: {
        invoke: { src: 'parseManifest' },
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
        id: 'render',
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
      assignFile: model.assign(manifestFileAssigner),
    },
    services: { loadManifest },
  },
)
