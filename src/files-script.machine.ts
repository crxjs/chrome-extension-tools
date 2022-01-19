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
    on: { ERROR: '#error', ABORT: '#error' },
    initial: 'parsed',
    states: {
      parsed: {
        entry: sendParent(({ fileName }) =>
          model.events.PARSE_RESULT(fileName, []),
        ),
        on: {
          EMIT_START: 'emitting',
        },
      },
      emitting: {
        entry: 'sendEmitFileToParent',
        on: {
          REF_ID: 'ready',
          FILE_EXCLUDED: 'excluded',
        },
      },
      ready: {
        entry: 'sendReadyToParent',
        on: {
          RENDER_START: 'complete',
        },
      },
      complete: {
        entry: 'sendCompleteToParent',
        on: {
          BUILD_START: 'parsed',
        },
      },
      error: {
        id: 'error',
        entry: 'forwardToParent',
        on: {
          BUILD_START: 'parsed',
        },
      },
      excluded: {},
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
      sendCompleteToParent: sendParent(({ id, refId: fileId }) =>
        model.events.COMPLETE_FILE({ id, refId: fileId! }),
      ),
      sendReadyToParent: sendParent(({ id }) =>
        model.events.READY(id),
      ),
    },
  },
)
