import { readFile, readJSON } from 'fs-extra'
import { from, Observable, of } from 'rxjs'
import { assign, EventFrom, sendParent } from 'xstate'
import { createModel } from 'xstate/lib/model'
import { isUndefined } from './helpers'
import { Asset, BaseAsset } from './types'
import { narrowEvent } from './xstate-helpers'
import { sharedEventCreators } from './xstate-models'

const context = {} as Asset
const model = createModel(context, {
  events: {
    PARSED: () => ({}),
    LOADED: (values: Pick<Asset, 'id' | 'source'>) => values,
    ...sharedEventCreators,
  },
})

type AssetEvent = EventFrom<typeof model>

/**
 * This machine uses services that are file type specific
 * and must be added when the machine is spawned.
 *
 * All services may emit an ERROR event
 *
 * Required services:
 *   - "loader": should emit LOADED events, may emit ROOT event
 *   - "parser": should emit ADD_FILE events
 */
export const assetMachine = model.createMachine(
  {
    context: model.initialContext,
    on: {
      ERROR: { actions: 'forwardToParent', target: '#error' },
    },
    initial: 'load',
    states: {
      load: {
        invoke: { src: 'loader', onDone: 'transform' },
        on: {
          LOADED: { actions: 'updateContext' },
          ROOT: { actions: 'forwardToParent' },
        },
      },
      transform: {
        entry: 'startPluginTransform',
        on: {
          PLUGINS_RESULT: {
            actions: 'updateContext',
            target: 'parse',
          },
        },
      },
      parse: {
        invoke: { src: 'parser', onDone: 'render' },
        on: {
          ADD_FILE: { actions: 'forwardToParent' },
        },
      },
      render: {
        entry: 'startPluginRender',
        on: {
          PLUGINS_RESULT: {
            actions: 'sendFileToParent',
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
              target: 'load',
            },
            'render',
          ],
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
      forwardToParent: sendParent((context, event) => event),
      sendFileToParent: sendParent((context, event) => {
        const { type, ...result } = narrowEvent(
          event,
          'PLUGINS_RESULT',
        )

        if (isUndefined(result.source))
          throw new TypeError('Output file source is undefined')

        let source: string | Uint8Array
        if (
          result.fileType === 'JSON' ||
          result.fileType === 'MANIFEST'
        ) {
          source = JSON.stringify(result.source)
        } else {
          source = result.source
        }

        return model.events.FILE_DONE({
          ...result,
          source,
          type: 'asset',
        })
      }),
      startPluginTransform: sendParent((context) =>
        model.events.PLUGINS_START({
          ...context,
          hook: 'transform',
        }),
      ),
      startPluginRender: sendParent((context) =>
        model.events.PLUGINS_START({
          ...context,
          hook: 'render',
        }),
      ),
      // @ts-expect-error It's the same
      updateContext: assign(({ id, ...context }, event) => {
        const {
          type,
          id: resultId,
          ...result
        } = narrowEvent(event, ['PLUGINS_RESULT', 'LOADED'])

        if (id === resultId)
          return {
            ...context,
            ...result,
          }

        return context
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

const stringLoader = ({ id }: Asset) =>
  from(
    readFile(id, 'utf8')
      .then((source) =>
        model.events.LOADED({
          id,
          source,
        }),
      )
      .catch(model.events.ERROR),
  )
const rawLoader = ({ id }: Asset) =>
  from(
    readFile(id)
      .then((source) =>
        model.events.LOADED({
          id,
          source,
        }),
      )
      .catch(model.events.ERROR),
  )
const jsonLoader = ({ id }: Asset) =>
  from(
    readJSON(id)
      .then((source) =>
        model.events.LOADED({
          id,
          source,
        }),
      )
      .catch(model.events.ERROR),
  )

export function createFileMachine(file: BaseAsset) {
  let loader: (context: Asset) => Observable<AssetEvent>
  if (file.fileType === 'CSS' || file.fileType === 'HTML') {
    loader = stringLoader
  } else if (
    file.fileType === 'JSON' ||
    file.fileType === 'MANIFEST'
  ) {
    loader = jsonLoader
  } else {
    loader = rawLoader
  }

  let parser: (context: Asset) => Observable<AssetEvent> = () =>
    of(model.events.PARSED())
  if (file.fileType === 'HTML') {
    parser = htmlParser
  } else if (file.fileType === 'MANIFEST') {
    parser = manifestParser
  }

  return assetMachine
    .withConfig({
      services: {
        loader,
        parser,
      },
    })
    .withContext(file)
}
