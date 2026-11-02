import type { PluginContext } from 'rollup'
import type { ResolvedConfig, UserConfig } from 'vite'
import { expect, test } from 'vitest'
import { pluginBackground } from './plugin-background'
import type { CrxPlugin } from './types'
import { pluginOptionsProvider } from './plugin-optionsProvider'
import type { ManifestV3 } from './manifest'
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

// Exercise the manifest hook used by real builds, including its browser/mode gate.
test.each([
  { browser: 'firefox', command: 'serve', allowed: true, defaultCsp: false },
  { browser: 'firefox', command: 'serve', allowed: true, defaultCsp: true },
  { browser: 'firefox', command: 'build', allowed: false, defaultCsp: false },
  { browser: 'firefox', command: 'build', allowed: false, defaultCsp: true },
  { browser: 'chrome', command: 'serve', allowed: false, defaultCsp: false },
] as const)(
  'localhost CSP is limited to $browser $command (default CSP: $defaultCsp)',
  async ({ browser, command, allowed, defaultCsp }) => {
    const plugins = pluginBackground() as CrxPlugin[]
    const plugin = plugins.find((p) => p.name === 'crx:background-loader-file')!
    const manifest = {
      manifest_version: 3,
      name: 'CSP regression',
      version: '1.0.0',
      background:
        browser === 'firefox'
          ? { scripts: ['background.js'], type: 'module' }
          : { service_worker: 'background.js', type: 'module' },
      content_security_policy: {
        extension_pages: "script-src 'self'; object-src 'none'",
        sandbox: "sandbox allow-scripts; script-src 'self'",
      },
    } as ManifestV3
    if (defaultCsp) delete manifest.content_security_policy
    const config = {
      command,
      server: { port: 5173 },
      plugins: [pluginOptionsProvider({ browser, manifest })],
    } as unknown as ResolvedConfig
    if (
      typeof plugin.config !== 'function' ||
      typeof plugin.configResolved !== 'function'
    )
      throw new Error('Missing configuration hooks')
    await plugin.config.call({} as never, config as unknown as UserConfig, {
      command,
      mode: 'test',
    })
    await plugin.configResolved(config)
    let source = ''
    const context = {
      emitFile(asset: { source: string }) {
        source = asset.source
        return 'loader'
      },
      getFileName() {
        return 'service-worker-loader.js'
      },
    }
    await plugin.renderCrxManifest!.call(
      context as unknown as PluginContext,
      manifest,
      {},
    )
    expect(manifest.content_security_policy?.extension_pages).toBe(
      allowed
        ? `script-src 'self' http://localhost:5173; object-src '${
            defaultCsp ? 'self' : 'none'
          }'`
        : defaultCsp
        ? undefined
        : "script-src 'self'; object-src 'none'",
    )
    expect(manifest.content_security_policy?.sandbox).toBe(
      defaultCsp ? undefined : "sandbox allow-scripts; script-src 'self'",
    )
    if (allowed) {
      expect(source).toBe(
        "import 'http://localhost:5173/@vite/env';\n" +
          `import 'http://localhost:5173${workerClientId}';\n` +
          "import 'http://localhost:5173/background.js';\n",
      )
    }
  },
)
