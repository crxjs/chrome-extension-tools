import fs from 'fs-extra'
import { from } from 'rxjs'
import { createMachine, sendParent } from 'xstate'
import {
  ProcessorContext,
  ProcessorEvent,
  processorModel as model,
} from './processor.model'
import { processorAction } from './processor.actions'

export const assetProcessor = createMachine<
  ProcessorContext,
  ProcessorEvent
>(
  {
    context: model.initialContext,
    on: {
      ERROR: { actions: 'forwardToParent', target: '.error' },
    },
    initial: 'loading',
    states: {
      loading: {
        invoke: { src: 'loadAsset' },
        on: {
          ASSET: 'preprocessing',
        },
      },
      preprocessing: {
        invoke: { src: 'preprocess' },
        on: {
          ASSET: 'postprocessing',
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
    actions: {
      forwardToParent: sendParent((context, event) => event),
    },
    services: {
      loadAsset: ({ file }) => {
        const reader = file.encoding
          ? fs.readFile(file.id, file.encoding)
          : fs.readFile(file.id)

        return from(
          reader
            .then((source) =>
              model.events.ASSET({ ...file, source }),
            )
            .catch((error) => model.events.ERROR(error)),
        )
      },
      preprocess: processorAction('pre'),
      postprocess: processorAction('post'),
    },
  },
)
