import { sendParent } from 'xstate'
import { createModel } from 'xstate/lib/model'
import { Script } from './types'
import { sharedEventCreators } from './files.sharedEvents'

const model = createModel({} as Script, {
  events: { ...sharedEventCreators },
})
export const scriptMachine = model.createMachine(
  {
    context: model.initialContext,
    on: {
      ERROR: { actions: 'forwardToParent', target: '#error' },
    },
    initial: 'complete',
    states: {
      complete: {
        entry: 'sendFileToParent',
        on: {
          // TODO: does vite serve clear outDir on change?
          START: 'complete',
        },
        tags: 'ready',
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
      sendFileToParent: sendParent((context) =>
        model.events.FILE_DONE({
          ...context,
          type: 'chunk',
        }),
      ),
    },
  },
)
