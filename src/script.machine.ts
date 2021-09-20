import { createModel } from 'xstate/lib/model'
import { Script } from './types'
import { sharedEventCreators } from './xstate-models'

const model = createModel({} as Script, {
  events: { ...sharedEventCreators },
})
export const scriptFile = model.createMachine({
  context: model.initialContext,
  on: {
    ERROR: { actions: 'forwardToParent', target: '#error' },
  },
  initial: 'write',
  states: {
    write: {
      invoke: { src: 'handleFile', onDone: 'complete' },
    },
    complete: {
      on: {
        // TODO: does vite serve clear outDir on change?
        CHANGE: {
          cond: ({ id }, { id: changedId }) => id === changedId,
          target: 'write',
        },
      },
    },
    error: {
      id: 'error',
      entry: 'forwardToParent',
      type: 'final',
    },
  },
})
