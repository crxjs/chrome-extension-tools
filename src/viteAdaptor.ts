import { PluginContext } from 'rollup'
import { interpret } from 'xstate'
import {
  debugHelper,
  logActorStates,
  narrowEvent,
} from './files_helpers'
import { join } from './path'
import { RPCEPlugin } from './types'
import { model, viteAdaptorMachine } from './viteAdaptor.machine'

const service = interpret(viteAdaptorMachine)

service.start()

debugHelper(service, (state, ids, actors) => {
  logActorStates(
    actors,
    join(process.cwd(), 'viteAdaptor-states.log'),
  )

  // if (ids.length > 1) return

  // const data = state.toJSON()
  // writeJsonSync(
  //   join(process.cwd(), 'viteAdaptor-state.json'),
  //   data,
  // )
})

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
          if (service.initialized)
            service.send(model.events.HOOK_START(prop, args))
          return value?.call?.(this, ...args)
        }
      } else if (rollupStartHooks.includes(prop)) {
        return function (this: PluginContext, ...args: any[]) {
          if (!service.initialized)
            return value?.call?.(this, ...args)

          const result = service
            .getSnapshot()
            .matches('starting')
            ? value?.call?.(this, ...args)
            : undefined

          service.send(model.events.HOOK_START(prop, args))

          return result
        }
      }

      return value
    },
  })
}
