import { assign, createMachine } from 'xstate'
import { send, pure } from 'xstate/lib/actions'
import { narrowEvent } from './helpers-xstate'
import { supervisorModel as model } from './supervisor.model'
import { supervisorSpawnActions } from './supervisorSpawn.actions'

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
          ADD_MANIFEST: { actions: 'assignEntryFile' },
          ADD_HTML: { actions: 'assignEntryFile' },
          ADD_SCRIPT: { actions: 'assignEntryFile' },
          START: 'start',
        },
      },
      start: {
        entry: 'sendEntryFiles',
        on: {
          ADD_MANIFEST: {
            cond: 'fileDoesNotExist',
            actions: 'spawnManifestFile',
          },
          ADD_CSS: {
            cond: 'fileDoesNotExist',
            actions: 'spawnCssFile',
          },
          ADD_HTML: {
            cond: 'fileDoesNotExist',
            actions: 'spawnHtmlFile',
          },
          ADD_IMAGE: {
            cond: 'fileDoesNotExist',
            actions: 'spawnImageFile',
          },
          ADD_JSON: {
            cond: 'fileDoesNotExist',
            actions: 'spawnJsonFile',
          },
          ADD_RAW: {
            cond: 'fileDoesNotExist',
            actions: 'spawnRawFile',
          },
          ADD_SCRIPT: {
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
            // TODO: restart the child actor
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
        const { file } = narrowEvent(event, [
          'ADD_CSS',
          'ADD_HTML',
          'ADD_JSON',
          'ADD_RAW',
          'ADD_IMAGE',
          'ADD_MANIFEST',
        ])

        return files.every(({ id }) => id === file.id)
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
            'ADD_MANIFEST',
            'ADD_HTML',
            'ADD_SCRIPT',
          ])

          return [...entries, entry]
        },
      }),
      sendEntryFiles: pure(({ entries }) =>
        entries.map((entry) => send(entry)),
      ),
      incrementFilesReady: assign({
        filesReady: ({ filesReady }) => filesReady + 1,
      }),
      resetFilesReady: assign({ filesReady: 0 }),
    },
  },
)
