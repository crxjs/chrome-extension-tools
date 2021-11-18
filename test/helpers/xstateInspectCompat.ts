import { CrxPlugin } from '$src/types'

export function xstateInspectCompat() {
  const plugin: CrxPlugin = {
    name: 'xstate-inspect-compat',
    configureServer(server) {
      ;(server as any).toJSON = () => 'ViteDevServer'
    },
  }

  return plugin
}
