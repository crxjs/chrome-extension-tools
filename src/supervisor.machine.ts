import { isUndefined } from '$src/helpers'
import {
  assign,
  createMachine,
  send,
  StateMachine,
  StateNodeConfig,
} from 'xstate'
import { pure } from 'xstate/lib/actions'
import { narrowEvent } from './helpers-xstate'
import {
  AssetFile,
  ProcessorContext,
  ProcessorEvent,
  ProcessorId,
} from './processor.model'
import { assetProcessor } from './processorForAssets.machine'
import { htmlProcessor } from './processorForHtml.machine'
import { manifestProcessor } from './processorForManifest.machine'
import { createProcessor } from './processorManager.machine'
import {
  SupervisorContext,
  SupervisorEvent,
  supervisorModel as model,
} from './supervisor.model'

const createInvokeStateNode = ({
  id,
  src,
}: {
  id: ProcessorId
  src: StateMachine<ProcessorContext, any, ProcessorEvent>
}): // eslint-disable-next-line @typescript-eslint/ban-types
StateNodeConfig<SupervisorContext, {}, SupervisorEvent> => ({
  invoke: { id, src: createProcessor(id, src) },
  on: { DONE: '.done' },
  states: { done: { type: 'final' } },
})

export const machine = createMachine<typeof model>(
  {
    id: 'supervisor',
    context: model.initialContext,
    initial: 'ready',
    states: {
      ready: {
        on: {
          ROOT: {
            actions: model.assign({
              root: (context, { root }) => root,
            }),
          },
          INPUT: {
            actions: model.assign({
              input: (context, { input }) => input,
            }),
          },
          ADD_PLUGIN: {
            actions: model.assign({
              plugins: ({ plugins }, { plugin }) => [
                ...plugins,
                plugin,
              ],
            }),
          },
          PARSE: 'parsing',
          PROCESS: 'processing',
        },
      },
      parsing: {
        type: 'parallel',
        onDone: 'ready',
        states: {
          manifest: createInvokeStateNode({
            id: 'manifest',
            src: manifestProcessor,
          }),
          html: createInvokeStateNode({
            id: 'html',
            src: htmlProcessor,
          }),
        },
        on: {
          FILE_READY: [
            {
              // NOTE: this might be a good use case for File.parentProcessorId
              cond: (context, { file }) =>
                file.processorId === 'html',
              actions: ['assignFile', 'sendToProcessor'],
            },
            {
              actions: 'assignFile',
            },
          ],
        },
      },
      processing: {
        entry: 'sendAllToProcessor',
        type: 'parallel',
        onDone: 'emitting',
        on: { FILE_READY: { actions: 'assignFile' } },
        states: {
          css: createInvokeStateNode({
            id: 'css',
            src: assetProcessor,
          }),
          images: createInvokeStateNode({
            id: 'images',
            src: assetProcessor,
          }),
          others: createInvokeStateNode({
            id: 'assets',
            src: assetProcessor,
          }),
        },
      },
      emitting: {
        invoke: {
          src: 'emitFiles',
          onDone: 'ready',
          onError: 'error',
        },
      },
      error: { type: 'final' },
    },
  },
  {
    actions: {
      assignFile: assign({
        files: ({ files }, event) => {
          const { file } = narrowEvent(event, 'FILE_READY')
          return { ...files, [file.id]: file }
        },
      }),
      sendToProcessor: pure((context, event) => {
        const { file } = narrowEvent(event, 'FILE_READY')
        return send(event, { to: file.processorId })
      }),
      sendAllToProcessor: pure(({ files: f }) => {
        const files = Object.values(f).filter(
          (x): x is AssetFile =>
            x.type === 'asset' && !isUndefined(x.processedAt),
        )

        return files.map((file) =>
          send(model.events.FILE_START(file), {
            to: file.processorId,
          }),
        )
      }),
    },
  },
)
