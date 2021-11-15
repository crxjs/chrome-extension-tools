import { RPCEPlugin } from './types'

export const xstateCompat = (): RPCEPlugin => {
  ;(Uint8Array.prototype as any)['toJSON'] = () => 'Uint8Array'
  return {
    name: 'xstate-compat',
    configureServer(server) {
      ;(server as any)['toJSON'] = () => 'ViteDevServer'
    },
  }
}
