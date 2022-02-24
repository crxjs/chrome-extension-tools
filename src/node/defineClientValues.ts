import { ResolvedConfig } from 'vite'
import { isObject } from './helpers'
import { join, normalize } from './path'

export function defineClientValues(code: string, config: ResolvedConfig) {
  let options = config.server.hmr
  options = options && typeof options !== 'boolean' ? options : {}
  const host = options.host || null
  const protocol = options.protocol || null
  const timeout = options.timeout || 30000
  const overlay = options.overlay !== false
  let hmrPort: number | string | undefined
  if (isObject(config.server.hmr)) {
    hmrPort = config.server.hmr.clientPort || config.server.hmr.port
  }
  if (config.server.middlewareMode) {
    hmrPort = String(hmrPort || 24678)
  } else {
    hmrPort = String(hmrPort || options.port || config.server.port!)
  }
  let hmrBase = config.base
  if (options.path) {
    hmrBase = join(hmrBase, options.path)
  }
  if (hmrBase !== '/') {
    hmrPort = normalize(`${hmrPort}${hmrBase}`)
  }

  return code
    .replace(`__MODE__`, JSON.stringify(config.mode))
    .replace(`__BASE__`, JSON.stringify(config.base))
    .replace(`__DEFINES__`, serializeDefine(config.define || {}))
    .replace(`__HMR_PROTOCOL__`, JSON.stringify(protocol))
    .replace(`__HMR_HOSTNAME__`, JSON.stringify(host))
    .replace(`__HMR_PORT__`, JSON.stringify(hmrPort))
    .replace(`__HMR_TIMEOUT__`, JSON.stringify(timeout))
    .replace(`__HMR_ENABLE_OVERLAY__`, JSON.stringify(overlay))
    .replace(`__SERVER_PORT__`, JSON.stringify(config.server.port?.toString()))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function serializeDefine(define: Record<string, any>): string {
    let res = `{`
    for (const key in define) {
      const val = define[key]
      res += `${JSON.stringify(key)}: ${
        typeof val === 'string' ? `(${val})` : JSON.stringify(val)
      }, `
    }
    return res + `}`
  }
}
