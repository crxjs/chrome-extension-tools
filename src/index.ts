import { createFilter, normalizePath } from '@rollup/pluginutils'
import { basename } from 'path'
import { RollupOptions } from 'rollup'
import { Plugin } from 'vite'
import { machine, model } from './files.machine'
import { isString, normalizeFilename } from './helpers'
import { runPlugins } from './index_runPlugins'
import { browserPolyfill } from './plugin-browserPolyfill'
import { esmBackground } from './plugin-esmBackground'
import { extendManifest } from './plugin-extendManifest'
import { hybridFormatOutput } from './plugin-hybridOutput'
import { packageJson } from './plugin-packageJson'
import { viteSupport } from './plugin-viteSupport'
import type {
  ChromeExtensionOptions,
  CompleteFile,
  ManifestV2,
  ManifestV3,
  RPCEPlugin,
} from './types'
import { useViteAdaptor } from './viteAdaptor'
import {
  narrowEvent,
  useConfig,
  useMachine,
} from './xstate-helpers'
import { isScript } from './xstate-models'

export { useViteAdaptor }
export type { ManifestV3, ManifestV2 }

export const simpleReloader = () => ({ name: 'simpleReloader' })

export const stubId = '_stubIdForRPCE'

export const chromeExtension = (
  pluginOptions: ChromeExtensionOptions = {},
): Plugin => {
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
      console.log('🚀 ~ files state', state)
    },
    error: (error) => {
      console.error(error)
    },
    complete: () => {
      console.log('files orchestrator complete')
    },
  })

  const files = new Set<CompleteFile>()

  return useViteAdaptor({
    name: 'chrome-extension',

    api: {
      files,
      /** The updated root folder, derived from either the Vite config or the manifest dirname */
      get root() {
        return service.getSnapshot().context.root
      },
    },

    config(config) {
      if (isString(config.root)) {
        send(model.events.ROOT(config.root))
      }
    },

    async options({ plugins = [], input = [], ...options }) {
      const builtins: RPCEPlugin[] = [
        packageJson(),
        esmBackground(),
        hybridFormatOutput(),
        pluginOptions.browserPolyfill && browserPolyfill(),
        viteSupport(),
        extendManifest(pluginOptions),
      ]
        .filter((x): x is RPCEPlugin => !!x)
        .map(useViteAdaptor)

      let finalInput: RollupOptions['input'] = [stubId]
      if (isString(input)) {
        send(
          model.events.ADD_FILE({
            id: input,
            fileType: 'MANIFEST',
            fileName: 'manifest.json',
          }),
        )
      } else if (Array.isArray(input)) {
        const result = input.filter((id) => {
          if (isHtml(id))
            send(
              model.events.ADD_FILE({
                id,
                fileType: 'HTML',
                fileName: id,
              }),
            )
          else if (basename(id).startsWith('manifest'))
            send(
              model.events.ADD_FILE({
                id,
                fileType: 'MANIFEST',
                fileName: 'manifest.json',
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
                  fileName: fileName.endsWith('.html')
                    ? fileName
                    : fileName + '.html',
                  fileType: 'HTML',
                }),
              )
            else if (fileName === 'manifest')
              send(
                model.events.ADD_FILE({
                  id,
                  fileType: 'MANIFEST',
                  fileName: 'manifest.json',
                }),
              )
            else return true

            return false
          },
        )

        if (result.length)
          finalInput = Object.fromEntries(result)
      }

      // Plugins added during the options hook miss that hook
      for (const b of builtins.filter(
        (x): x is RPCEPlugin => !!x,
      )) {
        const result = await b?.options?.call(this, options)
        options = result ?? options
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

            file.id = normalizePath(file.id)
            file.fileName = normalizePath(file.fileName)

            if (isScript(file))
              file.fileName = normalizeFilename(file.fileName)

            files.add(file)
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
      files.clear()
      send(model.events.CHANGE(id, change))
    },

    generateBundle(options, bundle) {
      delete bundle[stubId + '.js']
    },
  })
}
