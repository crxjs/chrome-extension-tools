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
        entry: 'sendEmitFileToParent',
        on: {
          START: 'complete',
        },
      },
      complete: {
        entry: 'sendCompleteToParent',
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
      sendEmitFileToParent: sendParent((context) =>
        model.events.EMIT_FILE({
          type: 'chunk',
          ...context,
        }),
      ),
      sendCompleteToParent: sendParent(({ id, fileId }) =>
        model.events.COMPLETE_FILE({ id, fileId: fileId! }),
      ),
    },
  },
)
