import {
  assign,
  forwardTo,
  pure,
  send,
} from 'xstate/lib/actions'
import { createModel } from 'xstate/lib/model'
import { sharedEventCreators } from './files.sharedEvents'
import { spawnFile } from './files_spawnFile'
import { Unpacked } from './helpers'
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
      dirName: process.cwd(),
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
      EXCLUDE_FILE_TYPE: {
        actions:
          // TODO: may want to filter out files
          model.assign({
            excluded: ({ excluded }, { fileType }) =>
              new Set(excluded).add(fileType),
          }),
      },
    },
    initial: 'configuring',
    states: {
      configuring: {
        on: {
          ENQUEUE_FILES: {
            actions: model.assign({
              entries: ({ entries }, { files }) => {
                const map = new Map<
                  string,
                  Unpacked<typeof files>
                >()

                for (const entry of [...entries, ...files]) {
                  map.set(entry.fileName, entry)
                }

                return [...map.values()]
              },
              root: ({ root }, { files }) => {
                const manifest = files.find(
                  ({ fileType }) => fileType === 'MANIFEST',
                ) as BaseAsset

                if (manifest?.dirName) return manifest.dirName
                if (manifest?.id) return dirname(manifest.id)
                return root
              },
            }),
          },
          ROOT: {
            actions: model.assign({
              root: (context, { root }) => root,
              entries: ({ entries }, { root }) =>
                entries.map((entry) => {
                  if (entry.fileType === 'MANIFEST') {
                    const dirName = resolve(process.cwd(), root)
                    return {
                      ...entry,
                      id: join(dirName, 'manifest.json'),
                      dirName,
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
        entry: 'spawnManifest',
        on: {
          EMIT_FILE: { actions: 'handleFile' },
          FILE_ID: { actions: 'forwardToFile' },
          PLUGINS_RESULT: { actions: 'forwardToFile' },
          PLUGINS_START: [
            {
              cond: (context, { fileType }) =>
                fileType === 'MANIFEST',
              actions: [
                'spawnEntryFiles',
                forwardTo('pluginsRunner'),
              ],
            },
            { actions: forwardTo('pluginsRunner') },
          ],
          READY: { cond: 'allFilesReady', target: 'ready' },
          SPAWN_FILE: [
            {
              cond: ({ files }, { file: { fileName } }) =>
                files.every(
                  (f) =>
                    f.getSnapshot()?.context.fileName !==
                    fileName,
                ),
              actions: 'spawnFile',
            },
          ],
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
      spawnManifest: send(({ entries }) => {
        const manifest = entries.find(
          ({ fileType }) => fileType === 'MANIFEST',
        )

        return model.events.SPAWN_FILE(manifest!)
      }),
      spawnEntryFiles: pure(({ entries }) =>
        entries
          .filter(({ fileType }) => fileType !== 'MANIFEST')
          .map((file) => send(model.events.SPAWN_FILE(file))),
      ),
      spawnFile: assign({
        files: ({ files, root }, event) => {
          const { file } = narrowEvent(event, 'SPAWN_FILE')
          return [...files, spawnFile(file, root)]
        },
      }),
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
