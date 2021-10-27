import { PluginContext } from 'rollup'
import { interpret } from 'xstate'
import { narrowEvent } from './files_helpers'
import { RPCEPlugin } from './types'
import { model, viteAdaptorMachine } from './viteAdaptor.machine'

const service = interpret(viteAdaptorMachine, { devTools: true })
service.start()

const viteConfigHooks = [
  'config',
  'configResolved',
  'configureServer',
]
const rollupStartHooks = ['options', 'buildStart']
const allHooks = viteConfigHooks.concat(rollupStartHooks)

export const useViteAdaptor = (plugin: RPCEPlugin) => {
  service.send(model.events.ADD_PLUGIN(plugin))

  return new Proxy(plugin, {
    ownKeys(target) {
      const keys = new Set(Reflect.ownKeys(target))
      allHooks.forEach((hook) => keys.add(hook))
      return Array.from(keys)
    },
    get(target, prop: keyof RPCEPlugin, receiver) {
      const value = Reflect.get(target, prop, receiver)

      if (!service.initialized) return value

      if (viteConfigHooks.includes(prop)) {
        return function (this: PluginContext, ...args: any[]) {
          // notify the adaptor of the vite hook
          if (service.initialized)
            service.send(model.events.HOOK_START(prop, args))
          // vite hooks are always run by vite
          return value?.call?.(this, ...args)
        }
      } else if (rollupStartHooks.includes(prop)) {
        return function (this: PluginContext, ...args: any[]) {
          if (!service.initialized)
            return value?.call?.(this, ...args)

          const snap = service.getSnapshot()

          if (snap.matches('error')) {
            const { error } = narrowEvent(snap.event, 'ERROR')
            this.error(error)
          }

          const result = snap.matches('starting')
            ? // it's vite build or pure rollup, don't interfere
              value?.call?.(this, ...args)
            : // it's vite serve, the adaptor will run this hook
              undefined

          service.send(model.events.HOOK_START(prop, args))

          return result
        }
      }

      return value
    },
  })
}

export const viteAdaptorReady = () =>
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
