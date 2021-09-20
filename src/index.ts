import { createFilter } from '@rollup/pluginutils'
import { basename } from 'path'
import { RollupOptions } from 'rollup'
import { Plugin } from 'vite'
import { isString } from './helpers'
import { machine, model } from './files.machine'
import { Asset, RPCEPlugin } from './types'
import { useViteAdaptor } from './viteAdaptor/viteAdaptor'
import {
  narrowEvent,
  useConfig,
  useMachine,
} from './xstate-helpers'
import { PluginsStartOptions } from './xstate-models'

export { useViteAdaptor }

const stubId = '_stubIdForRPCE'

function runPlugins(
  plugins: RPCEPlugin[],
  options: PluginsStartOptions,
): Asset {}

export const chromeExtension = (): Plugin => {
  const isHtml = createFilter(['**/*.html'])
  // const isScript = createFilter(
  //   ['**/*.js', '**/*.ts', '**/*.tsx', '**/*.jsx'],
  //   ['**/manifest*'],
  // )
  // const isCss = createFilter(['**/*.css'])
  // const isImage = createFilter([
  //   '**/*.png',
  //   '**/*.jpg',
  //   '**/*.jpeg',
  // ])
  // const isJson = createFilter(['**/*.json'], ['**/manifest*'])

  const { send, service, waitFor } = useMachine(machine)

  service.subscribe({
    next: (state) => {
      console.log('🚀 ~ supervisor ~ state', state.value)
      console.log('🚀 ~ supervisor ~ state', state)
    },
    error: (error) => {
      console.error(error)
    },
    complete: () => {
      console.log('supervisor complete')
    },
  })

  return useViteAdaptor({
    name: 'chrome-extension',

    api: { service },

    config(config) {
      if (isString(config.root)) {
        send(model.events.ROOT(config.root))
      }
    },

    options({ plugins = [], input = [], ...options }) {
      // TODO: add builtin plugins
      const builtins: (false | RPCEPlugin | null | undefined)[] =
        []

      let finalInput: RollupOptions['input'] = [stubId]
      if (isString(input)) {
        send(
          model.events.ADD_FILE({
            id: input,
            origin: 'input',
            fileType: 'MANIFEST',
          }),
        )
      } else if (Array.isArray(input)) {
        const result = input.filter((id) => {
          if (isHtml(id))
            send(
              model.events.ADD_FILE({
                id,
                origin: 'input',
                fileType: 'HTML',
              }),
            )
          else if (basename(id).startsWith('manifest'))
            send(
              model.events.ADD_FILE({
                id,
                origin: 'input',
                fileType: 'MANIFEST',
              }),
            )
          else return true

          return false
        })

        if (result.length) finalInput = result
      } else {
        const result = Object.entries(input).filter(
          ([fileName, id]) => {
            if (isHtml(id))
              send(
                model.events.ADD_FILE({
                  id,
                  fileName,
                  origin: 'input',
                  fileType: 'HTML',
                }),
              )
            else if (fileName === 'manifest')
              send(
                model.events.ADD_FILE({
                  id,
                  origin: 'input',
                  fileType: 'MANIFEST',
                }),
              )
            else return true

            return false
          },
        )

        if (result.length)
          finalInput = Object.fromEntries(result)
      }

      return {
        input: finalInput,
        plugins: plugins.concat(builtins),
        ...options,
      }
    },

    async buildStart({ plugins }) {
      useConfig(service, {
        actions: {
          handleError: (context, event) => {
            const { error } = narrowEvent(event, 'ERROR')
            this.error(error)
          },
          handleFile: (context, event) => {
            const { file } = narrowEvent(event, 'FILE_DONE')
            this.emitFile(file)
            this.addWatchFile(file.id)
          },
        },
        services: {
          pluginsRunner: () => (send, onReceived) => {
            onReceived(async (event) => {
              try {
                const { type, ...options } = narrowEvent(
                  event,
                  'PLUGINS_START',
                )
                const result = await runPlugins.call(
                  this,
                  plugins,
                  options,
                )
                send(model.events.PLUGINS_RESULT(result))
              } catch (error) {
                send(model.events.ERROR(error))
              }
            })
          },
        },
      })

      send(model.events.START())
      await waitFor((state) => state.matches('watch'))
    },

    resolveId(id) {
      if (id === stubId) return id
      return null
    },

    load(id) {
      if (id === stubId) return `console.log('${stubId}')`
      return null
    },

    watchChange(id, change) {
      send(model.events.CHANGE(id, change))
    },
  })
}
