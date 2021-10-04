import { dirname, join, resolve } from './path'
import {
  assign,
  forwardTo,
  pure,
  send,
} from 'xstate/lib/actions'
import { createModel } from 'xstate/lib/model'
import { spawnFile } from './files_spawnFile'
import { narrowEvent } from './files_helpers'
import {
  SharedEvent,
  sharedEventCreators,
} from './files.sharedEvents'

type AddFileEvent = Extract<
  SharedEvent,
  {
    type: 'ADD_FILE'
  }
>

export interface FilesContext {
  files: ReturnType<typeof spawnFile>[]
  root: string
  entries: AddFileEvent[]
}
const filesContext: FilesContext = {
  files: [],
  root: process.cwd(),
  entries: [
    {
      fileName: 'manifest.json',
      fileType: 'MANIFEST',
      id: 'manifest.json',
      type: 'ADD_FILE',
    },
  ],
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
 *
 * Required services:
 *   - handleFile
 *   - pluginsRunner
 */
export const machine = model.createMachine(
  {
    id: 'files',
    context: model.initialContext,
    on: { ERROR: '#error' },
    initial: 'configuring',
    states: {
      configuring: {
        entry: model.assign({ entries: [] }),
        on: {
          ADD_FILE: [
            {
              cond: (context, { fileType }) =>
                fileType === 'MANIFEST',
              actions: model.assign({
                entries: ({ entries }, event) =>
                  entries
                    .filter(
                      ({ fileType }) => fileType !== 'MANIFEST',
                    )
                    .concat([event]),
                root: (context, { id }) =>
                  resolve(process.cwd(), dirname(id)),
              }),
            },
            {
              actions: model.assign({
                entries: ({ entries }, event) => [
                  ...entries,
                  event,
                ],
              }),
            },
          ],
          ROOT: {
            actions: model.assign({
              root: (context, { root }) => root,
              entries: ({ entries }, { root }) =>
                entries.map((entry) => ({
                  ...entry,
                  id: join(root, 'manifest.json'),
                })),
            }),
          },
          START: 'starting',
        },
      },
      starting: {
        invoke: { id: 'pluginsRunner', src: 'pluginsRunner' },
        entry: ['restartExistingFiles', 'addAllEntryFiles'],
        on: {
          ADD_FILE: {
            cond: 'fileDoesNotExist',
            actions: 'spawnFile',
          },
          PLUGINS_START: { actions: forwardTo('pluginsRunner') },
          PLUGINS_RESULT: {
            actions: forwardTo(
              ({ files }, { id }) =>
                files.find((f) => id === f.id)!,
            ),
          },
          FILE_DONE: [
            {
              cond: 'readyForManifest',
              actions: ['renderManifest', 'handleFile'],
            },
            {
              cond: 'allFilesComplete',
              actions: 'handleFile',
              target: 'watching',
            },
            {
              actions: 'handleFile',
            },
          ],
        },
      },
      watching: {
        on: {
          CHANGE: {
            actions: pure(({ files }) => {
              const actions: any[] = []
              files.forEach((f) =>
                actions.push(forwardTo(() => f)),
              )
              return actions
            }),
            target: 'configuring',
          },
        },
      },
      error: { id: 'error', type: 'final' },
    },
  },
  {
    actions: {
      addAllEntryFiles: pure(({ entries }) =>
        entries.map((entry) => send(entry)),
      ),
      spawnFile: assign({
        files: ({ files, root }, event) => {
          const { type, ...file } = narrowEvent(
            event,
            'ADD_FILE',
          )

          const ref = spawnFile(file, root)

          return [...files, ref]
        },
      }),
      restartExistingFiles: pure(({ files }) =>
        files.map((file) =>
          send(model.events.START(), { to: file.id }),
        ),
      ),
      renderManifest: send(model.events.START(), {
        to: ({ files }) =>
          files.find(
            (f) =>
              f.getSnapshot()?.context.fileType === 'MANIFEST',
          )!,
      }),
    },
    guards: {
      allFilesComplete: ({ files }) =>
        files.every((file) =>
          file.getSnapshot()?.matches('complete'),
        ),
      readyForManifest: ({ files }) =>
        files.every((file) => {
          const snap = file.getSnapshot()
          if (snap?.context.fileType === 'MANIFEST')
            return snap?.matches('ready')
          return snap?.matches('complete')
        }),
      fileDoesNotExist: ({ files }, event) => {
        const { id } = narrowEvent(event, 'ADD_FILE')

        return files.every((f) => f.id !== id)
      },
    },
  },
)
