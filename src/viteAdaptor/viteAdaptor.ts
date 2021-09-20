import { RPCEPlugin } from '$src/types'
import { narrowEvent } from '$src/xstate-helpers'
import { EmittedFile, PluginContext } from 'rollup'
import { interpret } from 'xstate'
import {
  getEmittedFileId,
  viteAdaptorMachine,
  viteAdaptorModel,
} from './viteAdaptor.machine'

const service = interpret(viteAdaptorMachine)

service.start()

const sendEmitFile: PluginContext['emitFile'] = (
  file: EmittedFile,
) => {
  service.send(viteAdaptorModel.events.EMIT_FILE(file))
  return getEmittedFileId(file)
}

export const fileWriteComplete = () =>
  new Promise<void>((resolve, reject) =>
    service.subscribe((state) => {
      if (state.matches({ serve: { listening: 'ready' } }))
        resolve()
      if (state.matches({ serve: 'error' })) {
        const { error, id } = narrowEvent(state.event, 'ERROR')
        error.id = id
        reject(error)
      }
    }),
  )

export const getViteServer = () => {
  const state = service.getSnapshot()
  return state.matches('serve')
    ? state.context.server
    : undefined
}

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

export const useViteAdaptor = (plugin: RPCEPlugin) => {
  const proxy = new Proxy(plugin, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver)

      if (
        typeof prop === 'string' &&
        typeof value === 'function'
      )
        return function (this: PluginContext, ...args: any[]) {
          if (prop === 'configureServer') {
            const [server] = args
            service.send(
              viteAdaptorModel.events.SERVER_CONFIGURE(server),
            )
          } else {
            service.send(
              viteAdaptorModel.events.HOOK_START(prop),
            )
          }

          const shim = shimPluginContext(this)

          return value.call(shim, ...args)
        }

      return value
    },
  })

  return proxy
}
