import { of } from 'rxjs'
import { assign, EventFrom, sendParent } from 'xstate'
import { createModel } from 'xstate/lib/model'
import { sharedEventCreators } from './files.sharedEvents'
import { isUndefined } from './helpers'
import { Asset } from './types'
import { narrowEvent } from './xstate_helpers'

export const model = createModel(
  {} as Asset & { originalSource?: Asset['source'] },
  {
    events: {
      ...sharedEventCreators,
      LOADED: ({
        source,
        id,
      }: {
        source: any
        id?: string
      }) => ({
        source,
        id,
      }),
    },
  },
)

export type AssetEvent = EventFrom<typeof model>

/**
 * This machine uses services that are file type specific
 * and must be added when the machine is spawned.
 *
 * All services may emit an ERROR event
 *
 * Required services:
 *   - "loader": should emit LOADED event, may emit ROOT event
 *   - "parser": should emit PARSED event
 */
export const assetMachine = model.createMachine(
  {
    context: model.initialContext,
    on: {
      ERROR: { target: '#error', actions: 'forwardToParent' },
      ABORT: '#error',
    },
    initial: 'loading',
    states: {
      loading: {
        invoke: { src: 'loader' },
        on: {
          LOADED: {
            actions: assign({
              originalSource: (context, { source }) => source,
              id: ({ id }, { id: newId }) => newId ?? id,
            }),
            target: 'transforming',
          },
        },
      },
      transforming: {
        entry: sendParent(
          ({ originalSource, source, ...rest }) =>
            model.events.PLUGINS_START({
              source: originalSource!,
              ...rest,
            }),
        ),
        on: {
          PLUGINS_RESULT: {
            cond: ({ id }, event) => id === event.id,
            actions: assign({
              // @ts-expect-error it's the same type
              source: (context, { source }) => source,
            }),
            target: 'parsing',
          },
        },
      },
      parsing: {
        invoke: { src: 'parser' },
        on: {
          PARSE_RESULT: {
            actions: 'forwardToParent',
            target: 'parsed',
          },
        },
      },
      parsed: {
        on: { EMIT_START: 'emitting' },
      },
      emitting: {
        entry: 'sendEmitFileToParent',
        on: {
          FILE_ID: {
            cond: ({ id }, event) => {
              return id === event.id
            },
            actions: assign({
              fileId: (context, { fileId }) => {
                return fileId
              },
            }),
            target: 'ready',
          },
          FILE_EXCLUDED: 'excluded',
        },
      },
      ready: {
        entry: 'sendReadyToParent',
        on: {
          RENDER_START: {
            cond: ({ fileType }) => fileType !== 'MANIFEST',
            target: 'rendering',
          },
          RENDER_MANIFEST: {
            cond: ({ fileType }) => fileType === 'MANIFEST',
            target: 'rendering',
          },
        },
      },
      rendering: {
        entry: sendParent(({ originalSource, ...rest }) =>
          model.events.PLUGINS_START(rest),
        ),
        on: {
          PLUGINS_RESULT: {
            actions: 'sendCompleteToParent',
            target: 'complete',
          },
        },
      },
      complete: {
        id: 'complete',
        on: {
          CHANGE: [
            {
              cond: ({ id }, { id: changedId }) =>
                id === changedId,
              target: 'changed',
            },
            'unchanged',
          ],
        },
      },
      changed: {
        on: { BUILD_START: 'loading' },
      },
      unchanged: {
        on: { BUILD_START: 'transforming' },
      },
      error: {
        id: 'error',
        on: { BUILD_START: 'loading' },
      },
      excluded: {
        entry: 'sendReadyToParent',
      },
    },
  },
  {
    actions: {
      forwardToParent: sendParent((context, event) => event),
      sendCompleteToParent: sendParent(
        ({ id, fileId }, event) => {
          const { type, ...r } = narrowEvent(
            event,
            'PLUGINS_RESULT',
          )
          const result = r as Asset

          if (isUndefined(fileId))
            throw new TypeError(`fileId is undefined for ${id}`)

          let source: string | Uint8Array
          if (
            result.fileType === 'JSON' ||
            result.fileType === 'MANIFEST'
          ) {
            source = JSON.stringify(result.source)
          } else {
            source = result.source
          }

          return model.events.COMPLETE_FILE({
            id,
            fileId,
            source,
          })
        },
      ),
      sendEmitFileToParent: sendParent(({ source, ...rest }) =>
        model.events.EMIT_FILE({
          type: 'asset',
          ...rest,
        }),
      ),
      sendReadyToParent: sendParent(({ id }) =>
        model.events.READY(id),
      ),
    },
    services: {
      loader: ({ id }) =>
        of(
          model.events.ERROR(
            new Error(
              `service "loader" is not defined on "${id}"`,
            ),
          ),
        ),
      parser: ({ id }) =>
        of(
          model.events.ERROR(
            new Error(
              `service "parser" is not defined on "${id}"`,
            ),
          ),
        ),
    },
  },
)
