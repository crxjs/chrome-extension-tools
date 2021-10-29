import { sendParent } from 'xstate'
import { createModel } from 'xstate/lib/model'
import { Script } from './types'
import { sharedEventCreators } from './files.sharedEvents'

const model = createModel(
  {} as Script & { children?: Map<string, never> },
  {
    events: { ...sharedEventCreators },
  },
)
export const scriptMachine = model.createMachine(
  {
    context: model.initialContext,
    on: {
      ERROR: { actions: 'forwardToParent', target: '#error' },
    },
    initial: 'emitting',
    states: {
      emitting: {
        entry: 'sendEmitFileToParent',
        on: {
          FILE_ID: 'ready',
        },
      },
      ready: {
        entry: 'sendReadyToParent',
        on: {
          START: 'complete',
        },
      },
      complete: {
        entry: 'sendCompleteToParent',
        on: {
          START: 'emitting',
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
      sendReadyToParent: sendParent(({ id }) =>
        model.events.READY(id),
      ),
    },
  },
)
