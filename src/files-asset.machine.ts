import { of } from 'rxjs'
import { assign, EventFrom, sendParent } from 'xstate'
import { createModel } from 'xstate/lib/model'
import { sharedEventCreators } from './files.sharedEvents'
import { narrowEvent } from './files_helpers'
import { isUndefined } from './helpers'
import { Asset, BaseAsset, Script } from './types'

export const model = createModel({} as Asset, {
  events: {
    ...sharedEventCreators,
    LOADED: ({ source }: { source: any }) => ({ source }),
    PARSED: (files: (BaseAsset | Script)[]) => ({ files }),
  },
})

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
      ERROR: { actions: 'forwardToParent', target: '#error' },
      ASSET_ID: {
        cond: ({ id }, event) => {
          return id === event.id
        },
        actions: assign({
          assetId: (context, { assetId }) => {
            return assetId
          },
        }),
      },
    },
    initial: 'loading',
    states: {
      loading: {
        invoke: { src: 'loader' },
        on: {
          LOADED: {
            actions: assign({
              source: (context, { source }) => source,
            }),
            target: 'transforming',
          },
        },
      },
      transforming: {
        entry: 'sendPluginsStart',
        on: {
          PLUGINS_RESULT: {
            cond: ({ id }, event) => {
              return id === event.id
            },
            actions: assign({
              source: (context, { source }) => source as any,
              fileName: (context, { fileName }) => fileName,
            }),
            target: 'parsing',
          },
        },
      },
      parsing: {
        invoke: { src: 'parser' },
        on: {
          PARSED: {
            actions: sendParent(
              ({ source, ...rest }, { files }) =>
                model.events.EMIT_FILE(
                  {
                    type: 'asset',
                    ...rest,
                  },
                  files,
                ),
            ),
            target: 'ready',
          },
        },
      },
      ready: {
        on: {
          START: [
            {
              cond: ({ fileType }, { manifest }) =>
                fileType === 'MANIFEST' && manifest,
              target: 'rendering',
            },
            {
              cond: ({ fileType }, { manifest }) =>
                fileType !== 'MANIFEST' && !manifest,
              target: 'rendering',
            },
          ],
        },
      },
      rendering: {
        entry: 'sendPluginsStart',
        on: {
          PLUGINS_RESULT: {
            actions: 'sendSourceToParent',
            target: 'complete',
          },
        },
      },
      complete: {
        on: {
          CHANGE: [
            {
              cond: ({ id }, { id: changedId }) =>
                id === changedId,
              target: 'changed',
            },
            'ready',
          ],
        },
      },
      changed: {
        on: { START: 'loading' },
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
      forwardToParent: sendParent((context, event) => event),
      sendSourceToParent: sendParent(
        ({ id, assetId }, event) => {
          const { type, ...r } = narrowEvent(
            event,
            'PLUGINS_RESULT',
          )
          const result = r as Asset

          if (isUndefined(assetId))
            throw new TypeError(`assetId is undefined for ${id}`)

          let source: string | Uint8Array
          if (
            result.fileType === 'JSON' ||
            result.fileType === 'MANIFEST'
          ) {
            source = JSON.stringify(result.source)
          } else {
            source = result.source
          }

          return model.events.SET_ASSET_SOURCE({
            assetId,
            source,
          })
        },
      ),
      sendPluginsStart: sendParent((context) =>
        model.events.PLUGINS_START(context),
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
