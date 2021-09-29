import { EmittedFile, PluginContext } from 'rollup'
import { interpret } from 'xstate'
import { narrowEvent } from './files_helpers'
import { isFunction, isString, isUndefined } from './helpers'
import { RPCEPlugin } from './types'
import {
  configHook,
  getEmittedFileId,
  serverHook,
  viteAdaptorMachine,
  viteAdaptorModel,
} from './viteAdaptor.machine'

const service = interpret(viteAdaptorMachine)

service.start()

// service.subscribe((state) => {
//   console.log('🚀 ~ state', state)
// })

const sendEmitFile: PluginContext['emitFile'] = (
  file: EmittedFile,
) => {
  service.send(viteAdaptorModel.events.EMIT_FILE(file))
  return getEmittedFileId(file)
}

export const fileWriteComplete = () =>
  new Promise<void>((resolve, reject) => {
    const sub = service.subscribe({
      next(state) {
        if (state.matches({ serve: { listening: 'ready' } })) {
          sub.unsubscribe()
          resolve()
        } else if (state.matches({ serve: 'error' })) {
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

export const shimPluginContext = (
  pluginContext: PluginContext,
): PluginContext => {
  if (!service.initialized) return pluginContext

  const proxy = new Proxy(pluginContext, {
    get(target, key, receiver) {
      switch (key) {
        case 'emitFile':
          if (service.initialized) {
            return sendEmitFile
          }

        // eslint-disable-next-line no-fallthrough
        default:
          return Reflect.get(target, key, receiver)
      }
    },
  })

  return proxy
}

export const useViteAdaptor = (plugin: RPCEPlugin) =>
  new Proxy(plugin, {
    ownKeys(target) {
      const keys = new Set(Reflect.ownKeys(target))
      keys.add(configHook)
      keys.add(serverHook)
      return Array.from(keys)
    },
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver)

      if (isString(prop) && isFunction(value))
        return function (this: PluginContext, ...args: any[]) {
          if (!service.initialized)
            return value.call(this, ...args)

          service.send(
            viteAdaptorModel.events.HOOK_START(prop, args),
          )

          const shim = shimPluginContext(this)

          return value.call(shim, ...args)
        }
      else if (
        (configHook === prop || serverHook === prop) &&
        isUndefined(value)
      )
        return function (this: PluginContext, ...args: any[]) {
          if (service.initialized)
            service.send(
              viteAdaptorModel.events.HOOK_START(prop, args),
            )
        }

      return value
    },
  })
