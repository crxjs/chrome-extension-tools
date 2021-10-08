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
    initial: 'ready',
    states: {
      ready: {
        entry: 'sendFileToParent',
        on: {
          START: 'complete',
        },
      },
      complete: {
        on: {
          START: 'ready',
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
      sendFileToParent: sendParent((context) =>
        model.events.EMIT_FILE({
          type: 'chunk',
          ...context,
        }),
      ),
    },
  },
)
