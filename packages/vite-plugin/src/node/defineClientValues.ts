import { ResolvedConfigWithHMRToken } from './types'
import { isObject } from './helpers'
import { join, normalize } from './path'
import { supportsWebSocketConfig } from './viteVersion'

type HmrOptions = Exclude<
  ResolvedConfigWithHMRToken['server']['hmr'],
  boolean | undefined
>
type WebSocketOptions = Pick<
  HmrOptions,
  'clientPort' | 'host' | 'path' | 'port' | 'protocol' | 'timeout'
>
type ServerOptionsWithWebSocket = ResolvedConfigWithHMRToken['server'] & {
  ws?: false | WebSocketOptions
}

export function defineClientValues(
  code: string,
  config: ResolvedConfigWithHMRToken,
  viteVersion: string | undefined,
) {
  const server = config.server as ServerOptionsWithWebSocket
  const hmrOptions: HmrOptions = isObject(server.hmr) ? server.hmr : {}
  const wsOptions = supportsWebSocketConfig(viteVersion)
    ? server.ws
    : hmrOptions
  const options: WebSocketOptions =
    server.ws !== false && isObject(wsOptions) ? wsOptions : {}
  const host = options.host || null
  const protocol = options.protocol || null
  const timeout = options.timeout || 30000
  const overlay = hmrOptions.overlay !== false
  let hmrPort: number | string | undefined = options.clientPort || options.port
  if (server.middlewareMode) {
    hmrPort = String(hmrPort || 24678)
  } else {
    hmrPort = String(hmrPort || server.port!)
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
    .replace(`__HMR_TOKEN__`, JSON.stringify(config.webSocketToken || ''))
    .replace(`__HMR_PROTOCOL__`, JSON.stringify(protocol))
    .replace(`__HMR_HOSTNAME__`, JSON.stringify(host))
    .replace(`__HMR_PORT__`, JSON.stringify(hmrPort))
    .replace(`__HMR_TIMEOUT__`, JSON.stringify(timeout))
    .replace(`__HMR_ENABLE_OVERLAY__`, JSON.stringify(overlay))
    .replace(
      `__SERVER_PROTO__`,
      JSON.stringify(server.https ? 'https' : 'http'),
    )
    .replace(`__SERVER_PORT__`, JSON.stringify(server.port?.toString()))

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
