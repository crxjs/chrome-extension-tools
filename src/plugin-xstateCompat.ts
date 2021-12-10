import { CrxPlugin } from './types'

export const xstateCompat = (): CrxPlugin => {
  ;(Uint8Array.prototype as any)['toJSON'] = () => 'Uint8Array'
  ;(Buffer.prototype as any)['toJSON'] = () => 'Buffer'
  return {
    name: 'xstate-compat',
    crx: true,
    enforce: 'pre',
    configureServer(server) {
      ;(server as any)['toJSON'] = () => 'ViteDevServer'
    },
  }
}
