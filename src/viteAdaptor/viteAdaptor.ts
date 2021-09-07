import { EmittedFile, PluginContext } from 'rollup'
import { ViteDevServer } from 'vite'
import { interpret } from 'xstate'
import {
  viteAdaptorMachine,
  viteAdaptorModel,
  getEmittedFileId,
} from './viteAdaptor.machine'

const service = interpret(viteAdaptorMachine)

service.start()

const sendEmitFile: PluginContext['emitFile'] = (
  file: EmittedFile,
) => {
  service.send(viteAdaptorModel.events.EMIT_FILE(file))
  return getEmittedFileId(file)
}

export const sendConfigureServer = (server: ViteDevServer) => {
  service.send(viteAdaptorModel.events.SERVER_CONFIGURE(server))
}

export const filesWritten = () =>
  new Promise<void>((resolve, reject) =>
    service.subscribe((state) => {
      if (state.matches({ serve: { listening: 'ready' } }))
        resolve()
      if (state.matches({ serve: 'error' }))
        reject(
          state.context.lastError ??
            `context.lastError is ${typeof state.context
              .lastError}`,
        )
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
  hookName: string,
): PluginContext => {
  if (!service.initialized) return pluginContext

  service.send(viteAdaptorModel.events.HOOK_START(hookName))

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
