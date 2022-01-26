import { createFilter } from '@rollup/pluginutils'
import { outputFileSync } from 'fs-extra'
import path from 'path'
import { InputOptions, PluginContext } from 'rollup'
import { Plugin } from 'vite'
import { interpret } from 'xstate'
import { machine, model } from './files.machine'
import { SharedEvent } from './files.sharedEvents'
import {
  format,
  getJsFilename,
  isUndefined,
  not,
} from './helpers'
import { hijackHooks, startBuiltins } from './index_addPlugins'
import { categorizeInput } from './index_categorizeInput'
import { runPlugins } from './index_runPlugins'
import { basename } from './path'
import {
  combinePlugins,
  isRPCE,
  RpceApi,
} from './plugin_helpers'
import { stubId } from './stubId'
import type {
  Asset,
  BaseAsset,
  ChromeExtensionOptions,
  CrxHookType,
  CrxPlugin,
  EmittedFile,
  InternalCrxPlugin,
  ManifestV2,
  ManifestV3,
  Script,
  Writeable,
} from './types'
import {
  narrowEvent,
  useConfig,
  waitForState,
} from './xstate_helpers'

export type {
  ManifestV3,
  ManifestV2,
  CrxPlugin,
  EmittedFile as CompleteFile,
}

export const simpleReloader = (): Plugin => ({
  name: 'simple-reloader',
  buildStart() {
    this.warn(format`
    The simpleReloader has been integrated into RPCE.
    You can remove it from your config file.`)
  },
})

export const chromeExtension = (
  _pluginOptions: Partial<ChromeExtensionOptions> = {},
): Plugin => {
  const pluginOptions: ChromeExtensionOptions = {
    browserPolyfill: false,
    contentScriptFormat: 'esm',
    ..._pluginOptions,
  }

  const service = interpret(machine, {
    devTools: true,
  })

  /* Emitted file data by emitted file id*/
  const filesByRefId = new Map<string, EmittedFile>()
  const filesByFileName = new Map<string, EmittedFile>()

  const allPlugins = new Set<InternalCrxPlugin>()
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

  function setupFileEmitter(this: PluginContext) {
    useConfig(service, {
      actions: {
        handleFile: (context, event) => {
          try {
            const { file: f } = narrowEvent(event, 'EMIT_FILE')
            const file = Object.assign({}, f)

            if (file.type === 'chunk')
              file.fileName = getJsFilename(file.fileName)

            const refId = this.emitFile(file)
            service.send(
              model.events.REF_ID({
                id: file.id,
                fileId: refId,
              }),
            )

            const emittedFile = { ...file, refId }
            filesByRefId.set(refId, emittedFile)
            filesByFileName.set(file.fileName, emittedFile)

            this.addWatchFile(file.id)
          } catch (error) {
            service.send(model.events.ERROR(error))
          }
        },
      },
    })
  }

  async function addFiles(
    this: PluginContext,
    files: (BaseAsset | Script)[],
    command: 'build' | 'serve',
  ): Promise<Map<string, EmittedFile>> {
    if (command === 'build') {
      // We can add files on the fly in build
      setupPluginsRunner.call(this, 'transform')
      setupFileEmitter.call(this)
    } else {
      // Need to wait for full build in serve
      await waitForState(service, (state) => {
        if (state.event.type === 'ERROR') throw state.event.error
        return state.matches('complete')
      })
    }

    const prevNames = new Set(filesByFileName.keys())

    service.send(model.events.ADD_FILES(files))

    await waitForState(service, (state) => {
      if (state.event.type === 'ERROR') throw state.event.error
      return command === 'build'
        ? state.matches('ready')
        : state.matches('complete')
    })

    const result = new Map(filesByFileName)
    for (const fileName of prevNames) {
      result.delete(fileName)
    }

    // allow time for fs to catch up after `writeBundle`
    if (command === 'serve')
      await new Promise((r) => setTimeout(r, 50))

    return result
  }

  let builtins: CrxPlugin[] | undefined
  let pluginSetupDone: boolean
  let invalidationPath: string

  const api: RpceApi = {
    filesByRefId,
    filesByFileName,
    addFiles,
    get root() {
      return service.getSnapshot().context.root
    },
    service: service as any,
  }

  return {
    name: 'chrome-extension',

    api,

    async config(config, env) {
      builtins = startBuiltins(pluginOptions, env.command)
      for (const b of builtins) {
        const result = await b?.config?.call(this, config, env)
        config = result ?? config
      }

      return config
    },

    async configureServer(server) {
      const cbs = new Set<() => void | Promise<void>>()
      for (const b of builtins!) {
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

      const preAliasPlugins = plugins.splice(
        0,
        plugins.findIndex(({ name }) => name === 'alias') + 1,
      )
      const combined = combinePlugins(plugins, builtins!)
      const hijacked = hijackHooks(combined)
      plugins.length = 0
      plugins.push(...preAliasPlugins)
      plugins.push(...hijacked)
      pluginSetupDone = true

      service.send(model.events.ROOT(config.root))

      // Run possibly async builtins last
      // After this, Vite will take over
      for (const b of builtins!) {
        await b?.configResolved?.call(this, config)
      }

      if (config.command === 'serve') {
        invalidationPath = path.join(
          config.cacheDir!,
          'invalidateBuild.txt',
        )
        useConfig(service, {
          actions: {
            invalidateBuild: () => {
              try {
                outputFileSync(
                  invalidationPath,
                  Date.now().toString(),
                )
              } catch (error) {
                console.warn('could not invalidate build')
                console.error(error)
              }
            },
          },
        })
      }
    },

    async options(options) {
      service.start()

      const input = options.input ?? []
      const plugins = (options.plugins ??
        []) as InternalCrxPlugin[]

      const { crxFiles, finalInput } = categorizeInput(input, {
        HTML: createFilter(['**/*.html']),
        MANIFEST: (id: string) =>
          basename(id).startsWith('manifest'),
      })

      if (crxFiles.length)
        service.send(model.events.ADD_FILES(crxFiles))

      // Vite will run this hook for all our added plugins,
      // but we still need to add builtin plugins for Rollup
      if (!pluginSetupDone) {
        builtins =
          builtins ?? startBuiltins(pluginOptions, 'build')
        const combined = combinePlugins(plugins, builtins)
        const hijacked = hijackHooks(combined)
        plugins.length = 0
        plugins.push(...hijacked)

        service.start()
        pluginSetupDone = true
      }

      let result: InputOptions = {
        ...options,
        plugins,
        input: finalInput,
      }
      for (const plugin of plugins as InternalCrxPlugin[]) {
        const r = await plugin?.crxOptions?.call(this, result)
        result = r ?? result
      }
      return result
    },

    async buildStart(options) {
      this.addWatchFile(invalidationPath)

      const plugins: InternalCrxPlugin[] = options.plugins!
      await Promise.all(
        plugins.map((p) => p.crxBuildStart?.call(this, options)),
      )

      plugins
        .filter(not(isRPCE))
        .forEach((p) => p && allPlugins.add(p))
      setupPluginsRunner.call(this, 'transform')
      setupFileEmitter.call(this)

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

    async generateBundle(options, bundle, isWrite) {
      delete bundle[stubId + '.js']

      setupPluginsRunner.call(this, 'render')
      useConfig(service, {
        actions: {
          handleFile: (context, event) => {
            try {
              const { refId, source } = narrowEvent(
                event,
                'COMPLETE_FILE',
              )

              // This is a script, do nothing for now
              if (isUndefined(source)) return

              this.setAssetSource(refId, source)
              const file = filesByRefId.get(refId)!
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

      for (const p of allPlugins) {
        if (p.enforce === 'post') continue
        await p.crxGenerateBundle?.call(
          this,
          options,
          bundle,
          isWrite,
        )
      }
    },

    watchChange(id, change) {
      filesByRefId.clear()
      service.send(model.events.CHANGE(id, change))
    },

    closeWatcher() {
      if (service.initialized) service.stop()
    },
  }
}
