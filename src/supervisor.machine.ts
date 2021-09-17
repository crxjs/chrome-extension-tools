import { assign, createMachine } from 'xstate'
import { pure, send } from 'xstate/lib/actions'
import { createModel } from 'xstate/lib/model'
import { supervisorSpawnActions } from '../playground/second-attempt/fileSpawn.actions'
import { RPCEPlugin } from './types'
import { narrowEvent } from './xstate-helpers'
import {
  fileTypes,
  ParsingEvent,
  sharedEventCreators,
} from './xstate-models'

export interface SupervisorContext {
  files: any[]
  filesReady: number
  root: string
  entries: ParsingEvent[]
  plugins: Set<RPCEPlugin>
}
const supervisorContext: SupervisorContext = {
  files: [],
  filesReady: 0,
  root: process.cwd(),
  entries: [],
  plugins: new Set(),
}

export const model = createModel(supervisorContext, {
  events: {
    PLUGIN: (plugin: RPCEPlugin) => ({ plugin }),
    ROOT: (root: string) => ({ root }),
    ...sharedEventCreators,
  },
})

export const supervisorMachine = createMachine<typeof model>(
  {
    id: 'supervisor',
    context: model.initialContext,
    on: { ERROR: '#error' },
    initial: 'options',
    states: {
      options: {
        entry: 'clearEntryFiles',
        on: {
          ROOT: { actions: 'assignRoot' },
          PLUGIN: {
            actions: model.assign({
              plugins: ({ plugins }, { plugin }) => {
                plugins.add(plugin)
                return new Set(plugins)
              },
            }),
          },
          MANIFEST: { actions: 'assignEntryFile' },
          HTML: { actions: 'assignEntryFile' },
          START: 'start',
        },
      },
      start: {
        entry: 'sendEntryFiles',
        on: {
          MANIFEST: {
            cond: 'fileDoesNotExist',
            actions: 'spawnManifestFile',
          },
          CSS: {
            cond: 'fileDoesNotExist',
            actions: 'spawnCssFile',
          },
          HTML: {
            cond: 'fileDoesNotExist',
            actions: 'spawnHtmlFile',
          },
          IMAGE: {
            cond: 'fileDoesNotExist',
            actions: 'spawnImageFile',
          },
          JSON: {
            cond: 'fileDoesNotExist',
            actions: 'spawnJsonFile',
          },
          RAW: {
            cond: 'fileDoesNotExist',
            actions: 'spawnRawFile',
          },
          SCRIPT: {
            cond: 'fileDoesNotExist',
            actions: 'spawnScriptFile',
          },
          READY: [
            {
              cond: 'allFilesReady',
              actions: [
                'resetFilesReady',
                'emitFile',
                'watchFile',
              ],
              target: 'watch',
            },
            {
              actions: [
                'incrementFilesReady',
                'emitFile',
                'watchFile',
              ],
            },
          ],
          ROOT: { actions: 'assignRoot' },
        },
      },
      watch: {
        on: {
          CHANGE: {
            // TODO: handle change event type
            actions: send(
              // Send change to file
              (context, { id, ...change }) =>
                model.events.CHANGE(id, change),
              { to: (context, { id }) => id },
            ),
            target: 'options',
          },
        },
      },
      error: {
        id: 'error',
        type: 'final',
        entry: 'handleError',
      },
    },
  },
  {
    guards: {
      allFilesReady: ({ files, filesReady }) =>
        files.length === filesReady + 1,
      fileDoesNotExist: ({ files }, event) => {
        const { id } = narrowEvent(event, fileTypes)

        return files.every((f) => f.id !== id)
      },
    },
    actions: {
      ...supervisorSpawnActions,
      assignRoot: assign({
        root: (context, event) => {
          const { root } = narrowEvent(event, 'ROOT')
          return root
        },
      }),
      assignEntryFile: assign({
        entries: ({ entries }, event) => {
          const entry = narrowEvent(event, [
            'MANIFEST',
            'HTML',
            'SCRIPT',
          ])

          return [...entries, entry]
        },
      }),
      incrementFilesReady: assign({
        filesReady: ({ filesReady }) => filesReady + 1,
      }),
      resetFilesReady: assign({ filesReady: 0 }),
      sendEntryFiles: pure(({ entries }) =>
        entries.map((entry) => send(entry)),
      ),
    },
  },
)
