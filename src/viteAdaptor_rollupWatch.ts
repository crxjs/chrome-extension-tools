import fs from 'fs'
import { isUndefined } from 'lodash'
import { Plugin } from 'rollup'
import { Plugin as VitePlugin, ViteDevServer } from 'vite'
import { isString } from './helpers'
import { join } from './path'
import { RPCEHooks, RPCEPlugin } from './types'

// Creates an exhaustive list of RPCEHooks
const rpceHookRecord: Record<keyof RPCEHooks, 0> = {
  renderCrxCss: 0,
  renderCrxHtml: 0,
  renderCrxImage: 0,
  renderCrxJson: 0,
  renderCrxManifest: 0,
  renderCrxRaw: 0,
  transformCrxCss: 0,
  transformCrxHtml: 0,
  transformCrxImage: 0,
  transformCrxJson: 0,
  transformCrxManifest: 0,
  transformCrxRaw: 0,
}

// RPCE will run these hooks
const rpceHooks = Object.keys(rpceHookRecord)
// These hooks should run on the ViteDevServer
const serverHooks: (keyof VitePlugin | symbol)[] = [
  'resolveId',
  'load',
  'transform',
  'buildEnd',
  'closeBundle',
]
const excludedHooks = [...serverHooks, ...rpceHooks]

/**
 * Vite and RPCE both have duplicate sets of plugins.
 *
 * This plugin proxy will allow us to:
 *  - run only the build hooks in Rollup Watch, and
 *  - defer the excluded hooks to Vite or RPCE
 */
export function createPluginProxy(p: RPCEPlugin): RPCEPlugin {
  return new Proxy(p, {
    get(target, prop) {
      if (excludedHooks.includes(prop)) return undefined

      return Reflect.get(target, prop)
    },
  })
}

/**
 * Use Vite's dev server to resolve and load resources.
 *
 * This way we can take advantage of some of Vite's features
 * in background and content scripts.
 */
export function resolveFromServer(
  server: ViteDevServer,
): Plugin {
  return {
    name: 'resolve-from-vite-dev-server',
    resolveId(source) {
      if (source.startsWith('/@fs')) return source

      const id = join(server.config.root, source)
      const fileExists = fs.existsSync(id)
      // Add query param so plugins can differentiate (eg, exclude from HMR)
      // return fileExists ? `${id}?crx` : source
      return fileExists ? id : source
    },
    async load(id) {
      try {
        const result = await server.transformRequest(id)
        if (!result) return null
        if (isString(result)) return result
        if (isUndefined(result.code)) return null

        const { code, map } = result
        return { code, map }
      } catch (error) {
        console.log(`Could not load ${id}`)
        console.error(error)
        return null
      }
    },
  }
}
