import { createMachine } from 'xstate'
import { processorModel } from './processor.model'

export const htmlProcessor = createMachine<
  typeof processorModel
>(
  {
    id: 'manifestParser',
    context: processorModel.initialContext,
    on: { ERROR: { actions: 'forwardToParent' } },
    initial: 'loading',
    states: {
      loading: {
        invoke: { src: 'loadHtml' },
        on: { ASSET: 'preprocessing' },
      },
      preprocessing: {
        invoke: { src: 'preprocess' },
        on: { ASSET: 'parsing' },
      },
      parsing: {
        invoke: { src: 'parseHtml' },
        on: {
          ASSET: { actions: 'forwardToParent' },
          CHUNK: { actions: 'forwardToParent' },
          DONE: 'done',
        },
      },
      postprocessing: {
        invoke: { src: 'postprocess' },
        on: {
          ASSET: { actions: 'forwardToParent', target: 'done' },
        },
      },
      done: { type: 'final' },
    },
  },
  {
    // TODO: define actions
    // TODO: define services
  },
)
