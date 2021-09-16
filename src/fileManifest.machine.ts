import { cosmiconfig } from 'cosmiconfig'
import { dirname } from 'path'
import readPkgUp from 'read-pkg-up'
import { from } from 'rxjs'
import { assign, createMachine, sendParent } from 'xstate'
import { createAssetModel, ManifestAsset } from './file.model'
import { isUndefined } from './helpers'
import { narrowEvent } from './helpers-xstate'
import { supervisorModel } from './supervisor.model'

export const explorer = cosmiconfig('manifest', {
  cache: false,
  loaders: {
    '.ts': (filePath: string) => {
      require('esbuild-runner/register')
      const result = require(filePath)

      return result.default ?? result
    },
  },
})

const context = {} as ManifestAsset
const model = createAssetModel(context)
export const manifestFile = createMachine<typeof model>(
  {
    context: model.initialContext,
    on: {
      ERROR: { actions: 'forwardToParent', target: '#error' },
    },
    initial: 'load',
    states: {
      load: {
        type: 'parallel',
        onDone: 'transform',
        states: {
          manifest: {
            invoke: { src: 'loadManifest' },
            on: {
              READY: {
                actions: [
                  'assignFile',
                  sendParent(({ root }) =>
                    supervisorModel.events.ROOT(root),
                  ),
                ],
                target: '.done',
              },
            },
            states: { done: { type: 'final' } },
          },
          package: {
            invoke: { src: 'loadPackageJson' },
            on: {
              READY: {
                actions: 'assignFile',
                target: '.done',
              },
            },
            states: { done: { type: 'final' } },
          },
        },
      },
      transform: {
        invoke: { src: 'runTransformHooks' },
        on: {
          READY: { actions: 'assignFile', target: 'parse' },
        },
      },
      parse: {
        invoke: { src: 'parseManifest' },
        on: {
          '*': { actions: 'forwardToParent' },
          ERROR: {
            actions: 'forwardToParent',
            target: '#error',
          },
          READY: 'render',
        },
      },
      render: {
        id: 'render',
        invoke: { src: 'runRenderHooks' },
        on: {
          READY: { actions: 'assignFile', target: 'write' },
        },
      },
      write: {
        invoke: { src: 'emitFile' },
        on: { READY: 'watch' },
      },
      watch: {
        invoke: { src: 'watchFile' },
        on: { START: 'write' },
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
      assignFile: assign((context, event) => {
        const { file } = narrowEvent(event, 'READY')
        return { ...context, ...file }
      }),
      forwardToParent: sendParent((context, event) => event),
    },
    services: {
      loadManifest: ({ root, id }) => {
        const loader = id
          ? explorer.load(id)
          : explorer.search(root)

        return from(
          loader
            .then((result) => {
              if (result === null)
                throw new Error(
                  `Could not load manifest at location: ${id}`,
                )
              if (result.isEmpty)
                throw new Error(
                  `Manifest is empty at location: ${id}`,
                )

              return model.events.READY({
                fileName: 'manifest.json',
                root: dirname(result.filepath),
                jsonData: result.config,
              })
            })
            .catch(model.events.ERROR),
        )
      },
      loadPackageJson: () =>
        from(
          readPkgUp()
            .then((result) => {
              if (isUndefined(result))
                throw new Error('Could not load package.json')

              return model.events.READY({
                packageJson: result.packageJson,
              })
            })
            .catch(model.events.ERROR),
        ),
    },
  },
)
