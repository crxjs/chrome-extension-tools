import { createFilter } from '@rollup/pluginutils'
import { RollupOptions } from 'rollup'
import { Plugin } from 'vite'
import { machine, model } from './files.machine'
import { ERROR, isScript } from './files.sharedEvents'
import {
  narrowEvent,
  useConfig,
  useMachine,
} from './files_helpers'
import { getJsFilename, isString, not } from './helpers'
import { runPlugins } from './index_runPlugins'
import { basename } from './path'
import { browserPolyfill } from './plugin-browserPolyfill'
import { esmBackground } from './plugin-esmBackground'
import { extendManifest } from './plugin-extendManifest'
import { fileNames } from './plugin-fileNames'
import { htmlPaths } from './plugin-htmlPaths'
import { hybridFormat } from './plugin-hybridOutput'
import { packageJson } from './plugin-packageJson'
import {
  preValidateManifest,
  validateManifest,
} from './plugin-validateManifest'
import { viteServeCsp } from './plugin-viteServeCsp'
import { isRPCE } from './plugin_helpers'
import type {
  ChromeExtensionOptions,
  CompleteFile,
  ManifestV2,
  ManifestV3,
  RPCEPlugin,
} from './types'
import { useViteAdaptor } from './viteAdaptor'

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

  let isViteServe = false
  const [finalValidator, ...builtins]: RPCEPlugin[] = [
    validateManifest(), // we'll make this run last of all
    packageJson(),
    extendManifest(pluginOptions),
    preValidateManifest(), // pre validate the extended manifest
    htmlPaths(),
    esmBackground(),
    hybridFormat(),
    pluginOptions.browserPolyfill && browserPolyfill(),
    fileNames(),
    viteServeCsp(),
  ]
    .filter((x): x is RPCEPlugin => !!x)
    .map(useViteAdaptor)
    .map((p) => ({ ...p, name: `crx:${p.name}` }))

  const allPlugins = new Set<RPCEPlugin>(builtins)

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
      isViteServe = env.command === 'serve'

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

    async configureServer(server) {
      const cbs = new Set<() => void | Promise<void>>()
      for (const b of builtins) {
        const result = await b?.configureServer?.call(
          this,
          server,
        )
        result && cbs.add(result)
      }

      return async () => {
        try {
          for (const cb of cbs) {
            await cb()
          }
        } finally {
          cbs.clear()
        }
      }
    },

    async configResolved(config) {
      // Save user plugins to run RPCE hooks in buildStart
      config.plugins
        .filter(not(isRPCE))
        .forEach((p) => p && allPlugins.add(p))

      if (isViteServe) {
        // Just do this in Vite serve
      // We can't add them in the config hook :/
      // but sync changes in this hook seem to work...
      // TODO: test this specifically in new Vite releases
      const rpceIndex = config.plugins.findIndex(isRPCE)
      // @ts-expect-error Sorry Vite, I'm ignoring your `readonly`!
      config.plugins.splice(rpceIndex, 0, ...builtins)
        // @ts-expect-error Sorry Vite, I'm ignoring your `readonly`!
        config.plugins.push(finalValidator)
      }

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
      if (!isViteServe) {
        for (const b of builtins) {
          await b?.options?.call(this, options)
        }

        options.plugins = (options.plugins ?? []).concat(
          builtins,
        )
        options.plugins.push(finalValidator)
      }

      return { input: finalInput, ...options }
    },

    async buildStart({ plugins: rollupPlugins = [] }) {
      rollupPlugins
        .filter(not(isRPCE))
        .forEach((p) => p && allPlugins.add(p))

      const plugins = Array.from(allPlugins)

      useConfig(service, {
        actions: {
          handleError: (context, event) => {
            const { error } = narrowEvent(event, 'ERROR')
            this.error(error)
          },
          handleFile: (context, event) => {
            const { file } = narrowEvent(event, 'FILE_DONE')

            if (isScript(file))
              file.fileName = getJsFilename(file.fileName)

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
      await waitFor(
        (s) => s.matches('watch'),
        (s) => {
          if (
            s.matches('error') &&
            s.event.type === 'xstate.error'
          )
            throw s.event.data
        },
      )
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
