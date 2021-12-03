import { createFilter } from '@rollup/pluginutils'
import { PluginContext, RollupOptions } from 'rollup'
import { Plugin } from 'vite'
import { interpret } from 'xstate'
import { machine, model } from './files.machine'
import { SharedEvent } from './files.sharedEvents'
import {
  getJsFilename,
  isString,
  isUndefined,
  not,
} from './helpers'
import { runPlugins } from './index_runPlugins'
import { basename, isAbsolute, join } from './path'
import { autoPerms } from './plugin-autoPerms'
import { browserPolyfill } from './plugin-browserPolyfill'
import { configureRollupOptions } from './plugin-configureRollupOptions'
import { esmBackground } from './plugin-esmBackground'
import { extendManifest } from './plugin-extendManifest'
import { htmlMapScriptsToJS } from './plugin-htmlMapScriptsToJS'
import { hybridFormat } from './plugin-hybridOutput'
import { packageJson } from './plugin-packageJson'
import { transformIndexHtml } from './plugin-transformIndexHtml'
import {
  preValidateManifest,
  validateManifest,
} from './plugin-validateManifest'
import { viteServeFileWriter } from './plugin-viteServeFileWriter'
import { viteServeHMR_MV2 } from './plugin-viteServeHMR_MV2'
import { viteServeHMR_MV3 } from './plugin-viteServeHMR_MV3'
import { viteServeReactFastRefresh_MV2 } from './plugin-viteServeReactFastRefresh_MV2'
import { viteServeReactFastRefresh_MV3 } from './plugin-viteServeReactFastRefresh_MV3'
import { xstateCompat } from './plugin-xstateCompat'
import {
  combinePlugins,
  isRPCE,
  RpceApi,
} from './plugin_helpers'
import { stubId } from './stubId'
import type {
  Asset,
  ChromeExtensionOptions,
  CompleteFile,
  CrxHookType,
  CrxPlugin,
  ManifestV2,
  ManifestV3,
  Writeable,
} from './types'
import {
  narrowEvent,
  useConfig,
  waitForState,
} from './xstate_helpers'

export { simpleReloader } from './plugins-simpleReloader'
export type { ManifestV3, ManifestV2, CrxPlugin, CompleteFile }

function getAbsolutePath(input: string): string {
  return isAbsolute(input) ? input : join(process.cwd(), input)
}

export const chromeExtension = (
  pluginOptions: ChromeExtensionOptions = {},
): Plugin => {
  const isHtml = createFilter(['**/*.html'])

  const service = interpret(machine, {
    deferEvents: true,
    devTools: true,
  })
  service.start()

  const files = new Map<
    string,
    CompleteFile & { source?: string | Uint8Array }
  >()

  const builtins: CrxPlugin[] = [
    validateManifest(),
    xstateCompat(),
    viteServeFileWriter(),
    packageJson(),
    extendManifest(pluginOptions),
    autoPerms(),
    preValidateManifest(),
    esmBackground(),
    hybridFormat(),
    pluginOptions.browserPolyfill && browserPolyfill(),
    configureRollupOptions(),
    htmlMapScriptsToJS(),
    transformIndexHtml(),
    viteServeHMR_MV2(),
    viteServeHMR_MV3(),
    viteServeReactFastRefresh_MV2(),
    viteServeReactFastRefresh_MV3(),
  ]
    .filter((x): x is CrxPlugin => !!x)
    .map((p) => ({ ...p, name: `crx:${p.name}` }))
  let builtinPluginsDone = false
  let isViteServe: boolean
  function addBuiltinPlugins(plugins: CrxPlugin[]) {
    if (builtinPluginsDone) return

    const prepared = isViteServe
      ? builtins
      : builtins.filter(
          ({ name }) => !name.includes('vite-serve'),
        )

    const combined = combinePlugins(plugins, prepared)

    plugins.length = 0
    plugins.push(...combined)

    builtinPluginsDone = true
  }

  const allPlugins = new Set<CrxPlugin>()
  function setupPluginsRunner(
    this: PluginContext,
    hook: CrxHookType,
  ) {
    const plugins = Array.from(allPlugins)
    useConfig(service, {
      services: {
        pluginsRunner: () => (send, onReceived) => {
          onReceived(async (e: SharedEvent) => {
            try {
              const event = narrowEvent(e, 'PLUGINS_START')
              const result = await runPlugins.call(
                this,
                plugins,
                event as Asset,
                hook,
              )

              send(model.events.PLUGINS_RESULT(result))
            } catch (error) {
              send(model.events.ERROR(error))
            }
          })
        },
      },
    })
  }

  // Vite and Jest resolveConfig behavior is different
  // In Vite, the config module is imported twice as two different modules
  // In Jest, not only is the config module the same,
  //   the same plugin return value is used ¯\_(ツ)_/¯
  // The Vite hooks should only run once, regardless
  let viteConfigHook: boolean,
    viteConfigResolvedHook: boolean,
    viteServerHook: boolean

  const api: RpceApi = {
    files,
    get root() {
      return service.getSnapshot().context.root
    },
    service: service as any,
  }

  return {
    name: 'chrome-extension',

    api,

    async config(config, env) {
      if (viteConfigHook) return
      else viteConfigHook = true

      isViteServe = env.command === 'serve'

      for (const b of builtins) {
        const result = await b?.config?.call(this, config, env)
        config = result ?? config
      }

      return config
    },

    async configureServer(server) {
      if (viteServerHook) return
      else viteServerHook = true

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
      if (viteConfigResolvedHook) return
      else viteConfigResolvedHook = true

      if (isString(config.root)) {
        service.send(model.events.ROOT(config.root))
      }

      /**
       * Vite ignores replacements of `config.plugins`,
       * so we need to change the array in place.
       *
       * Something like this is used by one the major Vite contributors here:
       * https://github.com/antfu/vite-plugin-inspect/blob/0c31c478fdc02f398e68c567b01c5b9368a5efaa/src/node/index.ts#L217-L220
       */
      const plugins = config.plugins as Writeable<
        typeof config.plugins
      >

      // Add plugins to Vite config in serve mode
      // Otherwise, add them to Rollup options
      if (isViteServe) addBuiltinPlugins(plugins)

      // Run possibly async builtins last
      // After this, Vite will take over
      for (const b of builtins) {
        await b?.configResolved?.call(this, config)
      }
    },

    async options({ input = [], ...options }) {
      let finalInput: RollupOptions['input'] = [stubId]
      if (isString(input) && input.endsWith('index.html')) {
        // Vite passes "<root>/index.html" as default input
        // do nothing, the default manifest should work
      } else if (isString(input) && input.includes('manifest')) {
        service.send(
          model.events.UPDATE_FILES([
            {
              id: getAbsolutePath(input),
              fileType: 'MANIFEST',
              fileName: 'manifest.json',
            },
          ]),
        )
      } else if (Array.isArray(input)) {
        // Don't include html or manifest files
        const result: string[] = []
        input.forEach((id) => {
          if (isHtml(id))
            service.send(
              model.events.UPDATE_FILES([
                {
                  id: getAbsolutePath(id),
                  fileType: 'HTML',
                  fileName: id,
                },
              ]),
            )
          else if (basename(id).startsWith('manifest'))
            service.send(
              model.events.UPDATE_FILES([
                {
                  id: getAbsolutePath(id),
                  fileType: 'MANIFEST',
                  fileName: 'manifest.json',
                },
              ]),
            )
          else {
            result.push(id)
          }
        })

        if (result.length) finalInput = result
      } else {
        const result: [string, string][] = []
        Object.entries(input).forEach(([fileName, id]) => {
          if (isHtml(id))
            service.send(
              model.events.UPDATE_FILES([
                {
                  id: getAbsolutePath(id),
                  fileType: 'HTML',
                  fileName: fileName.endsWith('.html')
                    ? fileName
                    : fileName + '.html',
                },
              ]),
            )
          else if (basename(id).startsWith('manifest'))
            service.send(
              model.events.UPDATE_FILES([
                {
                  id: getAbsolutePath(id),
                  fileType: 'MANIFEST',
                  fileName: 'manifest.json',
                },
              ]),
            )
          else {
            result.push([fileName, id])
          }
        })

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

        const { plugins = [] } = options
        addBuiltinPlugins(plugins as CrxPlugin[])
        options.plugins = plugins
      }

      return { input: finalInput, ...options }
    },

    async buildStart({ plugins: rollupPlugins = [] }) {
      rollupPlugins
        .filter(not(isRPCE))
        .forEach((p) => p && allPlugins.add(p))

      setupPluginsRunner.call(this, 'transform')
      useConfig(service, {
        actions: {
          handleFile: (context, event) => {
            try {
              const { file: f } = narrowEvent(event, 'EMIT_FILE')
              const file = Object.assign({}, f)

              if (file.type === 'chunk')
                file.fileName = getJsFilename(file.fileName)

              const fileId = this.emitFile(file)
              service.send(
                model.events.FILE_ID({ id: file.id, fileId }),
              )

              files.set(fileId, file)
              this.addWatchFile(file.id)
            } catch (error) {
              service.send(model.events.ERROR(error))
            }
          },
        },
      })

      service.send(model.events.START())
      await waitForState(service, (state) => {
        if (
          state.matches('error') &&
          state.event.type === 'ERROR'
        )
          throw state.event.error

        return state.matches('ready')
      })
    },

    resolveId(id) {
      if (id === stubId) return id
      return null
    },

    load(id) {
      if (id === stubId) return `console.log('${stubId}')`
      return null
    },

    async generateBundle(options, bundle) {
      delete bundle[stubId + '.js']

      setupPluginsRunner.call(this, 'render')
      useConfig(service, {
        actions: {
          handleFile: (context, event) => {
            try {
              const { fileId, source } = narrowEvent(
                event,
                'COMPLETE_FILE',
              )

              // This is a script, do nothing for now
              if (isUndefined(source)) return

              this.setAssetSource(fileId, source)
              const file = files.get(fileId)!
              file.source = source
            } catch (error) {
              service.send(model.events.ERROR(error))
            }
          },
        },
      })

      service.send(model.events.START())
      await waitForState(service, (state) => {
        if (
          state.matches('error') &&
          state.event.type === 'ERROR'
        )
          throw state.event.error

        return state.matches('complete')
      })
    },

    watchChange(id, change) {
      files.clear()
      service.send(model.events.CHANGE(id, change))
    },
  }
}
