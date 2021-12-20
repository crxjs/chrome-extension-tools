import { createFilter } from '@rollup/pluginutils'
import { PluginContext } from 'rollup'
import { Plugin } from 'vite'
import { interpret } from 'xstate'
import { machine, model } from './files.machine'
import { SharedEvent } from './files.sharedEvents'
import {
  format,
  getJsFilename,
  isString,
  isUndefined,
  not,
} from './helpers'
import { categorizeInput } from './index_categorizeInput'
import { runPlugins } from './index_runPlugins'
import { basename } from './path'
import { autoPerms } from './plugin-autoPerms'
import { backgroundESM_MV2 } from './plugin-backgroundESM_MV2'
import { backgroundESM_MV3 } from './plugin-backgroundESM_MV3'
import { browserPolyfill } from './plugin-browserPolyfill'
import { configureRollupOptions } from './plugin-configureRollupOptions'
import { cssImports } from './plugin-css-imports'
import { extendManifest } from './plugin-extendManifest'
import { htmlMapScriptsToJS } from './plugin-htmlMapScriptsToJS'
import { hybridFormat } from './plugin-hybridOutput'
import { packageJson } from './plugin-packageJson'
import { runtimeReloader } from './plugin-runtimeReloader'
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

export type { ManifestV3, ManifestV2, CrxPlugin, CompleteFile }

export const simpleReloader = (): Plugin => ({
  name: 'simple-reloader',
  buildStart() {
    this.warn(format`
    The simpleReloader has been integrated into RPCE.
    You can remove it from your config file.`)
  },
})

export const chromeExtension = (
  pluginOptions: ChromeExtensionOptions = {},
): Plugin => {
  const service = interpret(machine, {
    deferEvents: true,
    devTools: true,
  })
  service.start()

  /* Emitted file data by emitted file id*/
  const emittedFiles = new Map<
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
    backgroundESM_MV2(),
    backgroundESM_MV3(),
    pluginOptions.browserPolyfill && browserPolyfill(),
    configureRollupOptions(),
    transformIndexHtml(),
    cssImports(),
    htmlMapScriptsToJS(),
    hybridFormat(),
    viteServeHMR_MV2(),
    viteServeHMR_MV3(),
    viteServeReactFastRefresh_MV2(),
    viteServeReactFastRefresh_MV3(),
    runtimeReloader(),
  ]
    .filter((x): x is CrxPlugin => !!x)
    .map((p) => ({ ...p, name: `crx:${p.name}` }))
  let isViteServe: boolean
  let setupPluginsDone = false
  function setupPlugins(plugins: CrxPlugin[]) {
    if (setupPluginsDone) return

    const prepared = isViteServe
      ? builtins
      : builtins.filter(
          ({ name }) => !name.includes('vite-serve'),
        )

    const combined = combinePlugins(plugins, prepared)

    plugins.length = 0
    plugins.push(...combined)

    setupPluginsDone = true
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
    emittedFiles: emittedFiles,
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

      setupPlugins(plugins)

      // Run possibly async builtins last
      // After this, Vite will take over
      for (const b of builtins) {
        await b?.configResolved?.call(this, config)
      }
    },

    async options({ input = [], ...options }) {
      const { crxFiles, finalInput } = categorizeInput(input, {
        HTML: createFilter(['**/*.html']),
        MANIFEST: (id: string) =>
          basename(id).startsWith('manifest'),
      })

      if (crxFiles.length)
        service.send(model.events.ENQUEUE_FILES(crxFiles))

      // Vite will run this hook for all our added plugins,
      // but we still need to add builtin plugins for Rollup
      if (!setupPluginsDone) {
        for (const b of builtins) {
          await b?.options?.call(this, options)
        }

        // Guard against Vite's possibly undefined plugins[]
        const { plugins = [] } = options
        setupPlugins(plugins as CrxPlugin[])
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

              const emittedFileId = this.emitFile(file)
              service.send(
                model.events.FILE_ID({
                  id: file.id,
                  fileId: emittedFileId,
                }),
              )

              emittedFiles.set(emittedFileId, file)
              this.addWatchFile(file.id)
            } catch (error) {
              service.send(model.events.ERROR(error))
            }
          },
        },
      })

      service.send(model.events.BUILD_START())
      await waitForState(service, (state) => {
        if (state.event.type === 'ERROR') throw state.event.error
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
              const file = emittedFiles.get(fileId)!
              file.source = source
            } catch (error) {
              service.send(model.events.ERROR(error))
            }
          },
        },
      })

      service.send(model.events.GENERATE_BUNDLE())
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
      emittedFiles.clear()
      service.send(model.events.CHANGE(id, change))
    },

    closeWatcher() {
      service.stop()
    },
  }
}
