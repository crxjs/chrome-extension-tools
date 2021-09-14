import { assign, createMachine } from 'xstate'
import { send } from 'xstate/lib/actions'
import { narrowEvent } from './helpers-xstate'
import { supervisorSpawnActions } from './supervisorSpawn.actions'
import { supervisorModel as model } from './supervisor.model'

export const supervisorMachine = createMachine<typeof model>(
  {
    id: 'supervisor',
    context: model.initialContext,
    on: { ERROR: '#error' },
    initial: 'options',
    states: {
      options: {
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
          PLUGIN: {
            actions: model.assign({
              plugins: ({ plugins }, { plugin }) => {
                plugins.add(plugin)
                return new Set(plugins)
              },
            }),
          },
          START: 'start',
        },
      },
      start: {
        entry: 'parseInput',
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
              actions: 'resetFilesReady',
              target: 'watch',
            },
            {
              actions: 'incrementFilesReady',
            },
          ],
        },
      },
      watch: {
        on: {
          CHANGE: {
            actions: send(
              // Send change to file
              (context, { id }) => model.events.CHANGE(id),
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
      incrementFilesReady: assign({
        filesReady: ({ filesReady }) => filesReady + 1,
      }),
      resetFilesReady: assign({ filesReady: 0 }),
    },
  },
)
