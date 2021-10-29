import fs from 'fs'
import { isUndefined } from 'lodash'
import { Plugin, watch } from 'rollup'
import { from } from 'rxjs'
import { ViteDevServer } from 'vite'
import { interpret } from 'xstate'
import { model as filesModel } from './files.machine'
import { format, isString } from './helpers'
import { join } from './path'
import {
  machine,
  model,
  optionsHook,
  pluginsHook,
  serverHook,
} from './plugin-viteServeFileWriter.machine'
import { excludedHooks } from './plugin-viteServeFileWriter_excludedHooks'
import { isRPCE } from './plugin_helpers'
import { stubId } from './stubId'
import { RPCEPlugin, Writeable } from './types'
import { narrowEvent, useConfig } from './xstate_helpers'

const service = interpret(machine, { devTools: true })
service.subscribe((state) => {
  console.log(
    'vite-serve-file-writer state',
    JSON.stringify(state.value),
  )
})

/**
 * The Vite dev server doesn't write files to the disk,
 * which is a requirement for Chrome Extension development.
 *
 * This plugin uses an instance of Rollup Watch to
 * fulfill this requirement. We'll use a plugin to load
 * files from the dev server, and then write them to disk.
 * This keeps configuration consistent and simple.
 *
 * Since we're still using the Vite server to load files,
 * Vite will call certain hooks (resolveId, load, transform).
 * These hooks should be excluded from Rollup Watch
 * to avoid duplicate hook calls.
 */
export function viteServeFileWriter(): RPCEPlugin {
  let lastError: unknown
  useConfig(service, {
    actions: {
      handleError({ server }, event) {
        const { error } = narrowEvent(event, 'ERROR')
        lastError = error
        server?.close()
      },
    },
    services: {
      rollupWatch:
        ({ options, plugins, server }) =>
        (send) => {
          const watcher = watch({
            ...options,
            // The context should not be touched here
            // we'll rewrite it in the hybrid output plugin
            context: 'this',
            output: {
              ...options?.output,
              dir: server!.config.build.outDir,
            },
            plugins: [
              resolveFromServer(server!),
              // @ts-expect-error Vite is using a different version of Rollup
              ...plugins,
            ],
          })

          watcher.on('event', async (event) => {
            console.log('rollup watcher event', event)
            try {
              if (event.code === 'BUNDLE_END') {
                send(model.events.BUNDLE_END(event))
              } else if (event.code === 'BUNDLE_START') {
                send(model.events.BUNDLE_START(event))
              } else if (event.code === 'ERROR') {
                await event.result?.close()
                const { error } = event

                if (
                  error.message?.includes('is not exported by')
                ) {
                  // TODO: add documentation with example
                  const message = format`Could not complete bundle because Vite did not pre-bundle a dependency.
                    You may need to add this dependency to your Vite config under \`optimizeDeps.include\`.
                    Original Error: ${error.message}`
                  throw new Error(message)
                } else {
                  throw error
                }
              }
            } catch (error) {
              console.log('rollup watcher error')
              delete (error as any).pluginCode
              delete (error as any).frame
              send(model.events.ERROR(error))
            }
          })

          return () => watcher.close()
        },
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
            .then(model.events.SERVER_READY)
            .catch((error) =>
              model.events.ERROR(error, 'waitForServer'),
            ),
        ),
    },
  })

  let isViteServe: boolean
  const pluginName = 'vite-serve-file-writer'
  return {
    name: pluginName,
    config(config, { command }) {
      isViteServe = command === 'serve'
    },
    [pluginsHook](config) {
      if (!isViteServe) return

      /**
       * Vite ignores changes to config.plugins,
       * so we need to modify the plugins in place.
       */
      const externalPlugins = config.plugins as Writeable<
        typeof config.plugins
      >
      /**
       * Rollup Watch will use these plugins to write
       * the files needed for Chrome Extension development
       */
      const internalPlugins: RPCEPlugin[] = []

      externalPlugins.forEach((plugin, i) => {
        if (
          plugin.name.endsWith(pluginName) ||
          plugin.name === 'alias' ||
          plugin.name.startsWith('vite:')
        )
          return

        /**
         * External hooks run when a file is requested from the server
         *
         * Delete hooks that should only be run by internal Rollup Watch
         */
        const externalPlugin = Object.assign(
          {},
          plugin,
        ) as RPCEPlugin
        delete externalPlugin.options
        delete externalPlugin.buildStart
        if (Object.keys(externalPlugin).length > 1)
          externalPlugins[i] = externalPlugin

        const internalPlugin = Object.assign(
          {},
          plugin,
        ) as RPCEPlugin
        // Internal hooks run inside a Rollup Watch instance
        // Delete hooks that should only run on the Vite server
        for (const hookName of excludedHooks)
          delete internalPlugin[hookName]
        if (Object.keys(internalPlugin).length > 1)
          internalPlugins.push(internalPlugin)
      })

      service.start()
      service.send(
        model.events.HOOK_START(pluginsHook, [
          { ...config, plugins: internalPlugins },
        ]),
      )

      // HTML script modules are not emitted in Vite serve
      externalPlugins
        .find(isRPCE)!
        .api.service.send(
          filesModel.events.EXCLUDE_FILE_TYPE('MODULE'),
        )

      if (lastError) throw lastError
    },
    [serverHook](...args: any[]) {
      if (!isViteServe) return

      if (service.initialized) {
        args[0].toJSON = () => 'ViteDevServer'
        service.send(model.events.HOOK_START(serverHook, args))
      }

      if (lastError) throw lastError
    },
    [optionsHook](...args: any[]) {
      if (!isViteServe) return

      if (service.initialized)
        service.send(model.events.HOOK_START(optionsHook, args))
      if (lastError) throw lastError
    },
    closeBundle() {
      service.stop()
    },
  }
}

/**
 * Use Vite's dev server to resolve and load resources.
 *
 * This way we can take advantage of some of Vite's features
 * and speed in background and content scripts.
 */
export function resolveFromServer(
  server: ViteDevServer,
): Plugin {
  return {
    name: 'resolve-from-vite-dev-server',
    resolveId(source) {
      if (source === stubId) return source
      if (source.startsWith('/@fs')) return source

      const id = join(server.config.root, source)
      const fileExists = fs.existsSync(id)
      return fileExists ? id : source
    },
    async load(id) {
      if (id === stubId) return id

      // Add crx query param so plugins can differentiate (eg, exclude from HMR)
      const [baseId, baseParams] = id.split('?')
      const fullParams = new URLSearchParams(baseParams)
      fullParams.set('crx', '')
      const requestId = `${baseId}?${fullParams}`

      const result = await server.transformRequest(requestId)

      if (!result) return null
      if (isString(result)) return result
      if (isUndefined(result.code)) return null

      const { code, map } = result
      return { code, map }
    },
  }
}

/**
 * For use in tests. Resolves when file write operation is complete.
 */
export const filesReady = () =>
  new Promise<void>((resolve, reject) => {
    const sub = service.subscribe({
      next(state) {
        if (state.matches({ serving: 'ready' })) {
          sub.unsubscribe()
          resolve()
        } else if (state.matches('error')) {
          const { error, id } = narrowEvent(state.event, 'ERROR')
          error.id = id
          sub.unsubscribe()
          reject(error)
        }
      },
      error(err) {
        reject(err)
      },
      complete() {
        reject(
          new Error(`The service "${service.id}" has stopped`),
        )
      },
    })
  })
