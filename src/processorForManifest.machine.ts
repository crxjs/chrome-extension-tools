import { createMachine } from 'xstate'
import { processorModel } from './processor.model'

export const manifestProcessor = createMachine<
  typeof processorModel
>(
  {
    context: processorModel.initialContext,
    on: {
      ERROR: { actions: 'forwardToParent', target: '.error' },
    },
    initial: 'loading',
    states: {
      loading: {
        type: 'parallel',
        onDone: 'preprocessing',
        states: {
          manifest: {
            invoke: { src: 'loadManifest' },
            on: {
              LOAD_JSON: {
                actions: 'assignManifest',
                target: '.done',
              },
            },
            states: { done: { type: 'final' } },
          },
          package: {
            invoke: { src: 'loadPackage' },
            on: {
              LOAD_JSON: {
                actions: 'assignPackageJson',
                target: '.done',
              },
            },
            states: { done: { type: 'final' } },
          },
        },
      },
      preprocessing: {
        invoke: { src: 'preprocess' },
        on: { ASSET: 'parsing' },
      },
      parsing: {
        invoke: { src: 'parseManifest' },
        on: {
          DONE: 'done',
          ASSET: { actions: 'forwardToParent' },
          CHUNK: { actions: 'forwardToParent' },
        },
      },
      postprocessing: {
        invoke: { src: 'postprocess' },
        on: {
          ASSET: { actions: 'forwardToParent', target: 'done' },
        },
      },
      done: { type: 'final' },
      error: { type: 'final' },
    },
  },
  {
    // TODO: define actions
    // TODO: define services
  },
)
