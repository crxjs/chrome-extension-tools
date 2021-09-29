import { createFilter, normalizePath } from '@rollup/pluginutils'
import { basename } from 'path'
import { RollupOptions } from 'rollup'
import { Plugin } from 'vite'
import { machine, model } from './files.machine'
import {
  isString,
  isUndefined,
  normalizeFilename,
} from './helpers'
import { runPlugins } from './index_runPlugins'
import { browserPolyfill } from './plugin-browserPolyfill'
import { esmBackground } from './plugin-esmBackground'
import { extendManifest } from './plugin-extendManifest'
import { hybridFormat } from './plugin-hybridOutput'
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

const isThisPlugin = (p: RPCEPlugin) =>
  p?.name === 'chrome-extension'

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

  let addBuiltinsDuringOptionsHook = true
  const builtins: RPCEPlugin[] = [
    packageJson(),
    esmBackground(),
    hybridFormat(),
    pluginOptions.browserPolyfill && browserPolyfill(),
    viteSupport(),
    extendManifest(pluginOptions),
  ]
    .filter((x): x is RPCEPlugin => !!x)
    .map(useViteAdaptor)
    .map((p) => ({ ...p, name: `crx:${p.name}` }))

  const vitePlugins = new Set<RPCEPlugin>()

  return useViteAdaptor({
    name: 'chrome-extension',

    api: {
      files,
      /** The updated root folder, derived from either the Vite config or the manifest dirname */
      get root() {
        return service.getSnapshot().context.root
      },
    },

    async config(config, env) {
      // Vite ignores changes to config.plugin, so we're adding them in configResolved
      // Just running the config hook for the builtins here for thoroughness
      for (const b of builtins) {
        const result = await b?.config?.call(this, config, env)
        config = result ?? config
      }

      if (isString(config.root)) {
        send(model.events.ROOT(config.root))
      }

      return config
    },

    async configResolved(config) {
      // Save user plugins to run RPCE hooks in buildStart
      config.plugins.forEach((p) => {
        if (!isUndefined(p) && !isThisPlugin(p))
          vitePlugins.add(p)
      })

      // We can't add them in the config hook :/
      // but sync changes in this hook seem to work...
      // TODO: test this specifically in new Vite releases
      const rpceIndex = config.plugins.findIndex(isThisPlugin)
      // @ts-expect-error Sorry Vite, I'm ignoring your `readonly`!
      config.plugins.splice(rpceIndex, 0, ...builtins)
      // Tell the options hook not to add the builtins again
      addBuiltinsDuringOptionsHook = false

      // Run possibly async builtins last
      // After this, Vite will take over
      for (const b of builtins) {
        await b?.configResolved?.call(this, config)
      }
    },

    async options({ input = [], ...options }) {
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

      // Vite will run this hook for all our added plugins,
      // but we still need to add builtin plugins for Rollup
      // TODO: check if this needs to be done in Rollup watch mode
      if (addBuiltinsDuringOptionsHook) {
        for (const b of builtins) {
          await b?.options?.call(this, options)
        }

        options.plugins = (options.plugins ?? []).concat(
          builtins,
        )
      }

      return { input: finalInput, ...options }
    },

    async buildStart({ plugins: rollupPlugins }) {
      const plugins = Array.from(vitePlugins)
        .concat(rollupPlugins)
        .filter((x) => !isUndefined(x) && !isThisPlugin(x))

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
