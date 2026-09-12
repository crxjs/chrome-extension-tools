import type { PluginContext } from 'rollup'
import type { ResolvedConfig } from 'vite'
import { expect, test } from 'vitest'
import { pluginBackground } from './plugin-background'
import type { CrxPlugin } from './types'
import { workerClientId } from './virtualFileIds'

test.each([
  { viteVersion: undefined, host: 'legacy-host' },
  { viteVersion: '8.0.0', host: 'legacy-host' },
  { viteVersion: '8.1.0', host: 'ws-host' },
  { viteVersion: '8.2.0', host: 'ws-host' },
])(
  'renders worker client values using Vite $viteVersion metadata',
  async ({ viteVersion, host }) => {
    const plugins = pluginBackground()
    if (!Array.isArray(plugins)) {
      throw new Error('Expected background plugins')
    }

    const clientPlugin = plugins.find(
      (plugin): plugin is CrxPlugin => plugin.name === 'crx:background-client',
    )
    if (!clientPlugin)
      throw new Error('Unable to find background client plugin')

    const loaderPlugin = plugins.find(
      (plugin): plugin is CrxPlugin =>
        plugin.name === 'crx:background-loader-file',
    )
    if (!loaderPlugin)
      throw new Error('Unable to find background loader plugin')

    const configResolved = loaderPlugin.configResolved
    if (typeof configResolved !== 'function') {
      throw new Error('Unable to find configResolved hook')
    }
    await configResolved({
      base: '/',
      define: {},
      mode: 'development',
      server: {
        hmr: { host: 'legacy-host' },
        ws: { host: 'ws-host' },
        https: false,
        port: 5173,
      },
      webSocketToken: 'test-token',
    } as unknown as ResolvedConfig)

    const load = clientPlugin.load
    if (typeof load !== 'function') throw new Error('Unable to find load hook')

    const context = viteVersion ? { meta: { viteVersion } } : {}
    const client = await load.call(
      context as unknown as PluginContext,
      workerClientId,
    )
    expect(client).toBeTypeOf('string')
    expect(client).not.toContain('__LIVE_RELOAD__')
    expect(client).toContain(JSON.stringify(host))
  },
)
