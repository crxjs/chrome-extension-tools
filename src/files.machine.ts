import { ActorRefFrom, spawn } from 'xstate'
import { assign, pure, send } from 'xstate/lib/actions'
import { createModel } from 'xstate/lib/model'
import { assetMachine, createFileMachine } from './asset.machine'
import { narrowEvent } from './xstate-helpers'
import {
  SharedEvent,
  sharedEventCreators,
} from './xstate-models'

export interface FilesContext {
  files: ActorRefFrom<typeof assetMachine>[]
  root: string
  entries: Extract<SharedEvent, { type: 'ADD_FILE' }>[]
}
const filesContext: FilesContext = {
  files: [],
  root: process.cwd(),
  entries: [],
}

export const model = createModel(filesContext, {
  events: { ...sharedEventCreators },
})

/**
 * The files orchestrator manages the loading and parsing
 * behavior of files that Rollup doesn't natively handle:
 * the manifest, css, html, json, images, and other files
 * like fonts, etc.
 *
 * This machine requires some implementation specific
 * actions and services:
 *
 * Required actions:
 *   - handleError
 *   - handleFile
 *
 * Required services:
 *   - pluginsRunner
 */
export const machine = model.createMachine(
  {
    id: 'files orchestrator',
    context: model.initialContext,
    on: { ERROR: '#error' },
    initial: 'options',
    states: {
      options: {
        entry: model.assign({ entries: [] }),
        on: {
          ADD_FILE: {
            actions: model.assign({
              entries: ({ entries }, event) => [
                ...entries,
                event,
              ],
            }),
          },
          ROOT: {
            actions: model.assign({
              root: (context, { root }) => root,
            }),
          },
          START: 'start',
        },
      },
      start: {
        entry: 'addAllEntryFiles',
        on: {
          ADD_FILE: {
            cond: 'fileDoesNotExist',
            actions: 'spawnFile',
          },
          FILE_DONE: [
            {
              cond: 'allFilesReady',
              actions: 'handleFile',
              target: 'watch',
            },
            {
              actions: 'handleFile',
            },
          ],
        },
      },
      watch: {
        on: {
          CHANGE: {
            actions: pure(({ files }, event) =>
              files.map((f) => send(event, { to: f.id })),
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
    actions: {
      addAllEntryFiles: pure(({ entries }) =>
        entries.map((entry) => send(entry)),
      ),
      spawnFile: assign({
        files: ({ files }, event) => {
          const { type, ...file } = narrowEvent(
            event,
            'ADD_FILE',
          )

          const ref = spawn(createFileMachine(file))

          return [...files, ref]
        },
      }),
    },
    guards: {
      allFilesReady: ({ files }) =>
        files.every((file) =>
          file.getSnapshot()?.hasTag('ready'),
        ),
      fileDoesNotExist: ({ files }, event) => {
        const { id } = narrowEvent(event, 'ADD_FILE')

        return files.every((f) => f.id !== id)
      },
    },
  },
)
