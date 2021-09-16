import { createFilter } from '@rollup/pluginutils'
import { basename } from 'path'
import { RollupOptions } from 'rollup'
import { Plugin } from 'vite'
import { isString } from './helpers'
import { narrowEvent } from './helpers-xstate'
import { stubId } from './manifest-input/fileNames'
import { supervisorMachine } from './supervisor.machine'
import {
  RPCEPlugin,
  supervisorModel as model,
} from './supervisor.model'
import { useConfig, useMachine } from './useMachine'
import {
  sendConfigureServer,
  shimPluginContext,
} from './viteAdaptor/viteAdaptor'

export type { ManifestV2, ManifestV3 } from './manifest-types'
export { simpleReloader } from './plugin-reloader-simple'

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

  const {
    send,
    service: supervisor,
    waitFor,
  } = useMachine(supervisorMachine)

  supervisor.subscribe({
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

  return {
    name: 'chrome-extension',

    config(config) {
      if (isString(config.root)) {
        send(model.events.ROOT(config.root))
      }
    },

    configureServer(server) {
      sendConfigureServer(server)
    },

    options({ plugins = [], input = [], ...options }) {
      // TODO: add builtin plugins
      const builtins: (false | RPCEPlugin | null | undefined)[] =
        []

      builtins.concat(plugins).forEach((p) => {
        if (p && p.name !== 'chrome-extension')
          send(model.events.PLUGIN(p))
      })

      let finalInput: RollupOptions['input'] = [stubId]
      if (isString(input)) {
        send(
          model.events.ADD_MANIFEST({
            id: input,
            origin: 'input',
          }),
        )
      } else if (Array.isArray(input)) {
        const result = input.filter((id) => {
          if (isHtml(id))
            send(model.events.ADD_HTML({ id, origin: 'input' }))
          else if (basename(id).startsWith('manifest'))
            send(
              model.events.ADD_MANIFEST({
                id,
                origin: 'input',
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
                model.events.ADD_HTML({
                  id,
                  fileName,
                  origin: 'input',
                }),
              )
            else if (fileName === 'manifest')
              send(
                model.events.ADD_MANIFEST({
                  id,
                  origin: 'input',
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
        plugins,
        ...options,
      }
    },

    async buildStart() {
      const shim = shimPluginContext(this, 'buildStart')
      useConfig(supervisor, {
        actions: {
          handleError: (context, event) => {
            const { error } = narrowEvent(event, 'ERROR')
            shim.error(error)
          },
          emitFile: (context, event) => {
            const { file } = narrowEvent(event, 'READY')
            shim.emitFile(file)
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
  }
}
