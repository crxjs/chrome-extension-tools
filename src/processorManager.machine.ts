import {
  ActorRefFrom,
  assign,
  createMachine,
  InvokeCreator,
  sendParent,
  spawn,
  StateMachine,
} from 'xstate'
import { narrowEvent } from './helpers-xstate'
import {
  ProcessorContext,
  ProcessorEvent,
  ProcessorId,
  RPCEPlugin,
} from './processor.model'
import {
  SupervisorContext,
  SupervisorEvent,
} from './supervisor.model'

interface BatchManagerContext {
  processors: Record<string, ActorRefFrom<any>>
  plugins: RPCEPlugin[]
}

export const processorManager = createMachine<
  BatchManagerContext,
  SupervisorEvent
>({
  states: {
    processing: {
      on: {
        ERROR: { actions: 'forwardToParent' },
        FILE_START: {
          cond: 'fileMatchesProcessorId',
          actions: 'spawnProcessor',
        },
        FILE_READY: [
          {
            cond: ({ processors }) =>
              Object.keys(processors).length === 1,
            actions: ['forwardToParent', 'stopProcessor'],
            target: 'done',
          },
          {
            actions: ['forwardToParent', 'stopProcessor'],
          },
        ],
      },
    },
    done: { type: 'final' },
  },
})

export function createProcessor(
  id: ProcessorId,
  machine: StateMachine<ProcessorContext, any, ProcessorEvent>,
): InvokeCreator<SupervisorContext, SupervisorEvent> {
  return ({ plugins }) =>
    processorManager.withConfig(
      {
        actions: {
          forwardToParent: sendParent((context, event) => event),
          spawnProcessor: assign({
            processors: ({ processors }, event) => {
              const { file } = narrowEvent(event, 'FILE_READY')

              const ref = spawn(
                machine.withContext({ file, plugins }),
                {
                  name: file.id,
                },
              )

              return { ...processors, [file.id]: ref }
            },
          }),
          stopProcessor: assign({
            processors: ({ processors }, event) => {
              const { file } = narrowEvent(event, 'FILE_READY')

              processors[file.id].stop?.()
              delete processors[file.id]

              return { ...processors }
            },
          }),
        },
        guards: {
          fileMatchesProcessorId: (context, event) => {
            const { file } = narrowEvent(event, 'FILE_START')
            return file.processorId === id
          },
        },
      },
      { processors: {}, plugins },
    )
}
