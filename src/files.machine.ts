import {
  assign,
  forwardTo,
  pure,
  send,
} from 'xstate/lib/actions'
import { createModel } from 'xstate/lib/model'
import { sharedEventCreators } from './files.sharedEvents'
import { spawnFile } from './files_spawnFile'
import { dirname, join, resolve } from './path'
import { BaseAsset, FileType, Script } from './types'
import { narrowEvent } from './xstate_helpers'

export interface FilesContext {
  files: ReturnType<typeof spawnFile>[]
  root: string
  entries: (BaseAsset | Script)[]
  excluded: Set<FileType>
}
const filesContext: FilesContext = {
  files: [],
  root: process.cwd(),
  entries: [
    {
      fileName: 'manifest.json',
      fileType: 'MANIFEST',
      id: join(process.cwd(), 'manifest.json'),
      dirname: process.cwd(),
    },
  ],
  excluded: new Set(),
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
 * This machine requires some external actions and services:
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
    on: {
      ERROR: {
        target: '.complete',
        actions: 'sendAbortToAllFiles',
      },
    },
    initial: 'configuring',
    states: {
      configuring: {
        on: {
          EXCLUDE_FILE_TYPE: {
            actions: model.assign({
              excluded: ({ excluded }, { fileType }) =>
                new Set(excluded).add(fileType),
            }),
          },
          UPDATE_FILES: [
            {
              cond: (context, { added }) =>
                added.some(
                  ({ fileType }) => fileType === 'MANIFEST',
                ),
              actions: model.assign({
                entries: (context, { added }) => added,
                root: (context, { added }) => {
                  const { id } = added.find(
                    ({ fileType }) => fileType === 'MANIFEST',
                  )!
                  return resolve(process.cwd(), dirname(id))
                },
              }),
            },
            {
              actions: model.assign({
                entries: ({ entries }, { added }) => [
                  ...entries,
                  ...added,
                ],
              }),
            },
          ],
          ROOT: {
            actions: model.assign({
              root: (context, { root }) => root,
              entries: ({ entries }, { root }) =>
                entries.map((entry) => {
                  if (entry.fileType === 'MANIFEST') {
                    const dir = resolve(process.cwd(), root)
                    return {
                      ...entry,
                      id: join(dir, 'manifest.json'),
                      dirname: dir,
                    }
                  }

                  return entry
                }),
            }),
          },
          START: {
            actions: 'forwardToAllFiles',
            target: 'parsing',
          },
        },
      },
      parsing: {
        invoke: { id: 'pluginsRunner', src: 'pluginsRunner' },
        entry: 'addEntryFiles',
        on: {
          EMIT_FILE: { actions: 'handleFile' },
          FILE_ID: { actions: 'forwardToFile' },
          PLUGINS_RESULT: { actions: 'forwardToFile' },
          PLUGINS_START: { actions: forwardTo('pluginsRunner') },
          READY: { cond: 'allFilesReady', target: 'ready' },
          UPDATE_FILES: { actions: 'updateFiles' },
        },
        initial: 'preparingFiles',
        states: {
          preparingFiles: {
            on: {
              EXCLUDE_FILE_TYPE: {
                actions: model.assign({
                  excluded: ({ excluded }, { fileType }) =>
                    new Set(excluded).add(fileType),
                }),
              },
              PLUGINS_RESULT: {
                actions: 'forwardToFile',
                target: 'emittingFiles',
              },
            },
          },
          emittingFiles: {},
        },
      },
      ready: {
        on: {
          START: {
            actions: 'forwardToAllFiles',
            target: 'rendering',
          },
        },
      },
      rendering: {
        invoke: { id: 'pluginsRunner', src: 'pluginsRunner' },
        on: {
          PLUGINS_START: { actions: forwardTo('pluginsRunner') },
          PLUGINS_RESULT: { actions: 'forwardToFile' },
          COMPLETE_FILE: [
            {
              cond: 'readyForManifest',
              actions: ['renderManifest', 'handleFile'],
            },
            {
              cond: 'allFilesComplete',
              actions: 'handleFile',
              target: 'complete',
            },
            {
              actions: 'handleFile',
            },
          ],
        },
      },
      complete: {
        on: {
          CHANGE: {
            actions: [
              'forwardToAllFiles',
              model.assign({
                // reset context.entries
                entries: ({ root }) => [
                  {
                    fileName: 'manifest.json',
                    fileType: 'MANIFEST',
                    id: root,
                  },
                ],
              }),
            ],
            target: 'configuring',
          },
        },
      },
    },
  },
  {
    actions: {
      addEntryFiles: send(({ entries }) =>
        model.events.UPDATE_FILES(entries),
      ),
      sendAbortToAllFiles: pure(({ files }) =>
        files.map((file) =>
          send(model.events.ABORT(), { to: () => file }),
        ),
      ),
      forwardToAllFiles: pure(({ files }) =>
        files.map((file) => forwardTo(() => file)),
      ),
      forwardToFile: forwardTo(({ files }, event) => {
        const { id } = narrowEvent(event, [
          'FILE_ID',
          'PLUGINS_RESULT',
        ])
        return files.find(
          // TODO: need to stop using actor ids, use context id instead
          (f) => f.getSnapshot()?.context.id === id,
        )!
      }),
      updateFiles: assign({
        files: ({ files, root, excluded }, event) => {
          const { added } = narrowEvent(event, 'UPDATE_FILES')
          const manifest = files.find(
            (f) =>
              f.getSnapshot()?.context.fileType === 'MANIFEST',
          )

          const newFiles = added
            // Do not re-add manifest, since manifest can have different id here
            .filter(({ fileType }) =>
              manifest ? fileType !== 'MANIFEST' : true,
            )
            // File does not exist
            .filter(({ id }) =>
              files.every(
                (f) => f.getSnapshot()?.context.id !== id,
              ),
            )
            // File type is not excluded
            .filter(({ fileType }) => !excluded.has(fileType))
            .map((file) => spawnFile(file, root))

          return [...files, ...newFiles]
        },
      }),
      // updateFilesReady: assign({
      //   filesReady: ({ filesReady }, event) => {
      //     const { id } = narrowEvent(event, 'READY')
      //     return [...filesReady, id]
      //   },
      // }),
      renderManifest: send(model.events.START(true), {
        to: ({ files }) =>
          files.find(
            (f) =>
              f.getSnapshot()?.context.fileType === 'MANIFEST',
          )!,
      }),
    },
    guards: {
      // allFilesReady: ({ files, filesReady }, event) => {
      //   narrowEvent(event, 'READY')
      //   return files.length === filesReady.length + 1
      // },
      allFilesReady: ({ files }) =>
        files.every((file) =>
          file.getSnapshot()?.matches('ready'),
        ),
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
    },
  },
)
