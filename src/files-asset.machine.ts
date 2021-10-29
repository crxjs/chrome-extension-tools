import { of } from 'rxjs'
import { assign, EventFrom, sendParent } from 'xstate'
import { pure } from 'xstate/lib/actions'
import { createModel } from 'xstate/lib/model'
import { sharedEventCreators } from './files.sharedEvents'
import { isUndefined } from './helpers'
import { Asset, BaseAsset, Script } from './types'
import { narrowEvent } from './xstate_helpers'

export const model = createModel(
  {} as Asset & {
    /** Used to track added/removed child files */
    children?: Map<string, BaseAsset | Script>
    prevChildren?: Map<string, BaseAsset | Script>
  },
  {
    events: {
      ...sharedEventCreators,
      LOADED: ({ source }: { source: any }) => ({ source }),
      PARSED: (files: (BaseAsset | Script)[]) => ({
        files: new Map(files.map((file) => [file.id, file])),
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
      ERROR: { actions: 'forwardToParent', target: '#error' },
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
        entry: 'sendPluginsStartToParent',
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
            actions: [
              'updateOwnChildren',
              'sendUpdateFilesToParent',
            ],
            target: 'emitting',
          },
        },
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
        },
      },
      ready: {
        entry: 'sendReadyToParent',
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
        entry: 'sendPluginsStartToParent',
        on: {
          PLUGINS_RESULT: {
            actions: 'sendCompleteToParent',
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
            'unchanged',
          ],
        },
      },
      changed: {
        on: { START: 'loading' },
      },
      unchanged: {
        on: { START: 'emitting' },
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
      sendUpdateFilesToParent: pure(
        ({ prevChildren }, event) => {
          const { files } = narrowEvent(event, 'PARSED')

          const addedFiles = Array.from(files.values()).filter(
            (file) => {
              return !prevChildren?.has(file.id)
            },
          )

          // TODO: remove files in watch mode
          // const removedFiles = Array.from(children.values())
          //   .filter((child) => !files.has(child.id))

          return sendParent(
            model.events.UPDATE_FILES(addedFiles),
          )
        },
      ),
      sendEmitFileToParent: sendParent(({ source, ...rest }) =>
        model.events.EMIT_FILE({
          type: 'asset',
          ...rest,
        }),
      ),
      sendPluginsStartToParent: sendParent((context) =>
        model.events.PLUGINS_START(context),
      ),
      sendReadyToParent: sendParent(({ id }) =>
        model.events.READY(id),
      ),
      updateOwnChildren: assign({
        children: (context, event) => {
          const { files } = narrowEvent(event, 'PARSED')
          return files
        },
        prevChildren: ({ children }) => children,
      }),
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
