import {
  assign,
  forwardTo,
  pure,
  respond,
  send,
} from 'xstate/lib/actions'
import { createModel } from 'xstate/lib/model'
import { sharedEventCreators } from './files.sharedEvents'
import { spawnFile } from './files_spawnFile'
import { dirname, join, resolve } from './path'
import {
  BaseAsset,
  FileType,
  ManifestAsset,
  Script,
} from './types'
import { narrowEvent } from './xstate_helpers'

export interface FilesContext {
  filesById: Map<string, ReturnType<typeof spawnFile>>
  filesByName: Map<string, ReturnType<typeof spawnFile>>
  root: string
  inputsByName: Map<string, BaseAsset | Script>
  excluded: Set<FileType>
}
const filesContext: FilesContext = {
  filesById: new Map(),
  filesByName: new Map(),
  root: process.cwd(),
  inputsByName: new Map().set('manifest.json', {
    fileName: 'manifest.json',
    fileType: 'MANIFEST',
    id: join(process.cwd(), 'manifest.json'),
    dirName: process.cwd(),
  }),
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
          ENQUEUE_FILES: {
            actions: model.assign({
              inputsByName: ({ inputsByName }, { files }) => {
                const map = new Map(inputsByName)

                for (const file of files) {
                  map.set(file.fileName, file)
                }

                return map
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
          EXCLUDE_FILE_TYPE: {
            actions: 'updateExcludedFiles',
          },
          ROOT: {
            actions: model.assign({
              root: (context, { root }) => root,
              inputsByName: ({ inputsByName }, { root }) => {
                const dirName = resolve(process.cwd(), root)
                const manifest = inputsByName.get(
                  'manifest.json',
                ) as ManifestAsset
                manifest.id = join(dirName, 'manifest.json')
                manifest.dirName = dirName

                return inputsByName
              },
            }),
          },
          BUILD_START: 'transforming',
        },
      },
      transforming: {
        invoke: { id: 'pluginsRunner', src: 'pluginsRunner' },
        on: {
          PLUGINS_START: { actions: forwardTo('pluginsRunner') },
          SPAWN_FILE: {
            cond: ({ filesByName }, { file: { fileName } }) =>
              !filesByName.has(fileName),
            actions: 'spawnFile',
          },
        },
        initial: 'manifest',
        states: {
          manifest: {
            entry: 'startManifest',
            on: {
              EXCLUDE_FILE_TYPE: {
                actions: 'updateExcludedFiles',
              },
              PLUGINS_RESULT: {
                actions: 'forwardToFile',
                target: 'assets',
              },
            },
          },
          assets: {
            entry: 'startAssets',
            on: {
              EXCLUDE_FILE_TYPE: {
                actions: 'updateExcludedFiles',
              },
              PLUGINS_RESULT: { actions: 'forwardToFile' },
              PARSE_RESULT: [
                {
                  cond: 'allFilesParsed',
                  target: 'emitting',
                },
                {
                  actions: 'startParsedFiles',
                },
              ],
            },
          },
          emitting: {
            entry: 'sendEmitStartToAllFiles',
            on: {
              EMIT_FILE: [
                {
                  cond: ({ excluded }, { file: { fileType } }) =>
                    excluded.has(fileType),
                  actions: respond((context, { file: { id } }) =>
                    model.events.FILE_EXCLUDED(id),
                  ),
                },
                {
                  actions: 'handleFile',
                },
              ],
              FILE_ID: { actions: 'forwardToFile' },
              READY: { cond: 'allFilesReady', target: '#ready' },
            },
          },
        },
      },
      ready: {
        id: 'ready',
        on: {
          GENERATE_BUNDLE: 'rendering',
        },
      },
      rendering: {
        invoke: { id: 'pluginsRunner', src: 'pluginsRunner' },
        on: {
          PLUGINS_START: { actions: forwardTo('pluginsRunner') },
          PLUGINS_RESULT: { actions: 'forwardToFile' },
        },
        initial: 'assets',
        states: {
          assets: {
            entry: 'renderAssets',
            on: {
              COMPLETE_FILE: [
                {
                  cond: 'readyForManifest',
                  actions: 'handleFile',
                  target: 'manifest',
                },
                {
                  actions: 'handleFile',
                },
              ],
            },
          },
          manifest: {
            entry: 'renderManifest',
            on: {
              COMPLETE_FILE: [
                {
                  cond: ({ filesByName }) =>
                    !!filesByName
                      .get('manifest.json')
                      ?.getSnapshot()
                      ?.matches('complete'),
                  actions: 'handleFile',
                  target: '#complete',
                },
                {
                  actions: 'handleFile',
                },
              ],
            },
          },
        },
      },
      complete: {
        id: 'complete',
        on: {
          CHANGE: {
            actions: 'forwardToAllFiles',
            target: 'configuring',
          },
        },
      },
    },
  },
  {
    actions: {
      sendAbortToAllFiles: pure(({ filesById }) =>
        [...filesById.values()].map((file) =>
          send(model.events.ABORT(), { to: () => file }),
        ),
      ),
      sendEmitStartToAllFiles: pure(({ filesById }) =>
        [...filesById.values()].map((file) =>
          send(model.events.EMIT_START(), { to: () => file }),
        ),
      ),
      forwardToAllFiles: pure(({ filesById }) =>
        [...filesById.values()].map((file) =>
          forwardTo(() => file),
        ),
      ),
      forwardToFile: forwardTo(({ filesById }, event) => {
        const { id } = narrowEvent(event, [
          'FILE_ID',
          'PLUGINS_RESULT',
        ])
        return filesById.get(id)!
      }),
      startManifest: pure(({ inputsByName, filesByName }) => {
        if (filesByName.has('manifest.json')) {
          const manifest = filesByName.get('manifest.json')!
          return send(model.events.BUILD_START(), {
            to: () => manifest,
          })
        } else {
          const manifest = inputsByName.get('manifest.json')!
          return send(model.events.SPAWN_FILE(manifest))
        }
      }),
      startAssets: pure(({ inputsByName, filesByName }) => {
        const assetInputs = new Map(inputsByName)
        assetInputs.delete('manifest.json')

        return [...assetInputs.entries()].map(
          ([fileName, input]) => {
            const file = filesByName.get(fileName)
            if (file)
              return send(model.events.BUILD_START(), {
                to: () => file,
              })
            return send(model.events.SPAWN_FILE(input))
          },
        )
      }),
      startParsedFiles: pure(({ filesByName }, event) => {
        const { children } = narrowEvent(event, 'PARSE_RESULT')
        return children.map((child) => {
          const file = filesByName.get(child.fileName)
          if (file)
            return send(model.events.BUILD_START(), {
              to: () => file,
            })
          return send(model.events.SPAWN_FILE(child))
        })
      }),
      spawnFile: assign(
        ({ filesById, filesByName, root }, event) => {
          const { file } = narrowEvent(event, 'SPAWN_FILE')
          if (filesByName.has(file.fileName)) return {}
          const actor = spawnFile(file, root)
          return {
            filesById: new Map(filesById).set(file.id, actor),
            filesByName: new Map(filesByName).set(
              file.fileName,
              actor,
            ),
          }
        },
      ),
      renderAssets: pure(({ filesByName }) => {
        const assetsByName = new Map(filesByName)
        assetsByName.delete('manifest.json')
        return [...assetsByName.entries()].map(
          ([fileName, file]) =>
            send(model.events.RENDER_START(fileName), {
              to: () => file,
            }),
        )
      }),
      renderManifest: send(
        model.events.RENDER_START('manifest.json'),
        {
          to: ({ filesByName }) =>
            filesByName.get('manifest.json')!,
        },
      ),
      updateExcludedFiles: assign({
        excluded: ({ excluded }, event) => {
          const { fileType } = narrowEvent(
            event,
            'EXCLUDE_FILE_TYPE',
          )

          return new Set(excluded).add(fileType)
        },
      }),
    },
    guards: {
      allFilesParsed: ({ filesById, excluded }, event) => {
        const { children } = narrowEvent(event, 'PARSE_RESULT')

        return (
          children.filter(
            ({ fileType }) => !excluded.has(fileType),
          ).length === 0 &&
          [...filesById.values()].every((file) => {
            const state = file.getSnapshot()
            return (
              state?.matches('parsed') ||
              state?.matches('excluded')
            )
          })
        )
      },
      allFilesReady: ({ filesById }) =>
        [...filesById.values()].every((file) => {
          const state = file.getSnapshot()
          return (
            state?.matches('ready') || state?.matches('excluded')
          )
        }),
      readyForManifest: ({ filesById }) => {
        const result = [...filesById.values()].every((file) => {
          const state = file.getSnapshot()
          if (state?.context.fileType === 'MANIFEST')
            return state?.matches('ready')
          return (
            state?.matches('complete') ||
            state?.matches('excluded')
          )
        })
        return result
      },
    },
  },
)
