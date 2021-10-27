import { RPCEPlugin } from '$src/types'

export function xstateInspectCompat() {
  const plugin: RPCEPlugin = {
    name: 'xstate-inspect-compat',
    configureServer(server) {
      ;(server as any).toJSON = () => 'ViteDevServer'
    },
  }

  return plugin
}
