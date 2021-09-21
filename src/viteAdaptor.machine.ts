import fs from 'fs-extra'
import path from 'path'
import {
  EmittedAsset,
  EmittedChunk,
  EmittedFile,
  PluginContext,
} from 'rollup'
import { from } from 'rxjs'
import { ViteDevServer } from 'vite'
import { ActorRef, spawn } from 'xstate'
import { assign, pure, send } from 'xstate/lib/actions'
import { createModel } from 'xstate/lib/model'
import { ModelEventsFrom } from 'xstate/lib/model.types'
import { isString, isUndefined } from './helpers'
import { writeAsIIFE } from './viteAdaptor-writeFromServerToIIFE'

export const VITE_SERVER_URL = '__VITE_SERVER_URL__'
export const viteServerUrlRegExp = new RegExp(
  VITE_SERVER_URL,
  'g',
)

interface Context {
  server?: ViteDevServer
  pluginContext?: PluginContext
  files: (EmittedFile & {
    id: string
    done?: true
    error?: string
  })[]
  writers: Record<
    string,
    ActorRef<ModelEventsFrom<typeof viteAdaptorModel>>
  >
  bundlers: Record<
    string,
    ActorRef<ModelEventsFrom<typeof viteAdaptorModel>>
  >
}

export const getEmittedFileId = (file: EmittedFile): string =>
  file.type === 'asset'
    ? file.fileName ?? file.name ?? 'fake asset id'
    : file.id

const context: Context = {
  files: [],
  writers: {},
  bundlers: {},
}

export const viteAdaptorModel = createModel(context, {
  events: {
    WRITE_ASSET: (file: EmittedAsset & { id: string }) => ({
      file,
    }),
    WRITE_CHUNK: (file: EmittedChunk) => ({ file }),
    EMIT_FILE: (file: EmittedFile) => ({
      file: {
        id: getEmittedFileId(file),
        ...file,
      },
    }),
    EMIT_DONE: (id: string) => ({ id }),
    HOOK_START: (hookName: string) => ({ hookName }),
    ERROR: (error: any, id?: string) => ({ id, error }),
    SERVER_CONFIGURE: (server: ViteDevServer) => ({ server }),
    SERVER_LISTENING: () => ({}),
  },
})

export const viteAdaptorMachine = viteAdaptorModel.createMachine(
  {
    id: 'viteAdaptor',
    context: viteAdaptorModel.initialContext,
    initial: 'start',
    states: {
      start: {
        on: {
          HOOK_START: {
            cond: (context, { hookName }) =>
              hookName === 'options',
            target: 'build',
          },
          SERVER_CONFIGURE: {
            target: 'serve',
            actions: viteAdaptorModel.assign({
              server: (context, { server }) => server,
            }),
          },
        },
      },
      build: {
        type: 'final',
      },
      serve: {
        initial: 'starting',
        states: {
          error: { id: 'error' },
          starting: {
            invoke: {
              src: 'waitForServer',
            },
            on: {
              SERVER_LISTENING: 'listening',
              ERROR: { target: '#error' },
              EMIT_FILE: {
                actions: viteAdaptorModel.assign({
                  files: ({ files }, { file }) => [
                    ...files,
                    file,
                  ],
                }),
              },
            },
          },
          listening: {
            entry: 'sendWriteEvents',
            initial: 'writing',
            states: {
              writing: {},
              check: {
                always: [
                  {
                    cond: ({ files }) => {
                      return files.every(({ done }) => done)
                    },
                    target: 'ready',
                  },
                  'writing',
                ],
              },
              ready: {},
            },
            on: {
              EMIT_FILE: {
                target: '.writing',
                actions: [
                  'addFile',
                  send((context, { file }) =>
                    file.type === 'asset'
                      ? viteAdaptorModel.events.WRITE_ASSET(file)
                      : viteAdaptorModel.events.WRITE_CHUNK(
                          file,
                        ),
                  ),
                ],
              },
              WRITE_ASSET: { actions: 'writeAsset' },
              WRITE_CHUNK: { actions: 'writeChunk' },
              EMIT_DONE: {
                target: '.check',
                actions: viteAdaptorModel.assign({
                  files: ({ files }, { id }) => {
                    return files.map((file) =>
                      file.id === id
                        ? { ...file, done: true }
                        : file,
                    )
                  },
                }),
              },
              ERROR: {
                target: '#error',
                actions: viteAdaptorModel.assign({
                  files: ({ files }, { id, error }) =>
                    files.map((file) =>
                      file.id === id
                        ? { ...file, error, done: true }
                        : file,
                    ),
                }),
              },
            },
          },
        },
      },
    },
  },
  {
    actions: {
      writeChunk: pure(({ server }, event) => {
        try {
          if (event.type !== 'WRITE_CHUNK')
            throw new Error(`Invalid event type: ${event.type}`)

          const { fileName, id } = event.file

          if (isUndefined(fileName))
            throw new Error(
              'EmittedChunk.fileName must be defined in vite serve',
            )

          if (isUndefined(server))
            throw new Error('vite server is undefined')

          return assign<
            Context,
            ModelEventsFrom<typeof viteAdaptorModel>
          >({
            bundlers: ({ bundlers }) => {
              const actorRef = spawn(
                from(
                  writeAsIIFE(event.file, server)
                    .then(() =>
                      viteAdaptorModel.events.EMIT_DONE(id),
                    )
                    .catch((error: Error) =>
                      viteAdaptorModel.events.ERROR(error, id),
                    ),
                ),
                id,
              )
              return { ...bundlers, [id]: actorRef }
            },
          })
        } catch (error) {
          return send(
            viteAdaptorModel.events.ERROR(
              error,
              event.type === 'WRITE_CHUNK'
                ? event.file.id
                : event.type,
            ),
          )
        }
      }),
      writeAsset: pure(({ server }, event) => {
        try {
          if (event.type !== 'WRITE_ASSET')
            throw new Error(`Invalid event type: ${event.type}`)

          const { fileName, source, id } = event.file

          if (isUndefined(fileName))
            throw new Error(
              'EmittedAsset.fileName must be defined in vite serve',
            )
          if (isUndefined(source))
            throw new Error(
              'EmittedAsset.source must be defined in vite serve',
            )

          if (isUndefined(server))
            throw new Error('vite server is undefined')

          const filePath = path.join(
            server.config.build.outDir,
            fileName,
          )

          const {
            port,
            host = 'localhost',
            https,
          } = server.config.server

          if (isUndefined(port))
            throw new TypeError('vite server port is undefined')

          const fileSource = isString(source)
            ? source.replace(
                viteServerUrlRegExp,
                `${https ? 'https' : 'http'}://${host}:${port}`,
              )
            : source

          return assign<
            Context,
            ModelEventsFrom<typeof viteAdaptorModel>
          >({
            writers: ({ writers }) => {
              const actorRef = spawn(
                from(
                  fs
                    .outputFile(filePath, fileSource)
                    .then(() =>
                      viteAdaptorModel.events.EMIT_DONE(id),
                    )
                    .catch((error) =>
                      viteAdaptorModel.events.ERROR(id, error),
                    ),
                ),
                id,
              )
              return { ...writers, [id]: actorRef }
            },
          })
        } catch (error) {
          return send(
            viteAdaptorModel.events.ERROR(
              error,
              event.type === 'WRITE_ASSET'
                ? event.file.id
                : event.type,
            ),
          )
        }
      }),
      sendWriteEvents: pure(({ files }) =>
        files.map((file) =>
          send(
            file.type === 'asset'
              ? viteAdaptorModel.events.WRITE_ASSET(file)
              : viteAdaptorModel.events.WRITE_CHUNK(file),
          ),
        ),
      ),
    },
    services: {
      waitForServer: ({ server }) =>
        from(
          new Promise<ViteDevServer>((resolve, reject) => {
            if (!server?.httpServer)
              reject(
                new Error(
                  `vite httpServer is ${typeof server?.httpServer}`,
                ),
              )

            server?.httpServer?.once('listening', resolve)
          })
            .then(viteAdaptorModel.events.SERVER_LISTENING)
            .catch((error) =>
              viteAdaptorModel.events.ERROR(
                error,
                'waitForServer',
              ),
            ),
        ),
    },
  },
)
