import { describe, expect, it } from 'vitest'
import { getChangedFilePath, getHmrHostConfig, pluginHMR } from './plugin-hmr'
import { pluginOptionsProvider } from './plugin-optionsProvider'

describe('getHmrHostConfig', () => {
  it('uses the Vite 8 WebSocket options without writing deprecated HMR fields', () => {
    const hmr = {}
    Object.defineProperty(hmr, 'host', {
      enumerable: true,
      get() {
        throw new Error('deprecated HMR host was read')
      },
    })
    const server = { hmr, ws: { port: 24678 } }

    const result = getHmrHostConfig(server, '8.2.0')

    expect(result).toEqual({ ws: { host: 'localhost', port: 24678 } })
  })

  it.each(['8.1.0', '8.2.0', '9.0.0'])(
    'uses WebSocket options on Vite %s even when server.ws is absent',
    (version) => {
      expect(getHmrHostConfig({}, version)).toEqual({
        ws: { host: 'localhost' },
      })
    },
  )

  it.each([undefined, '3.2.11', '4.5.14', '5.4.0', '6.0.0', '7.3.1', '8.0.0'])(
    'keeps legacy HMR options on Vite %s even when server.ws is present',
    (version) => {
      const server = { hmr: { port: 24678 }, ws: undefined }

      expect(getHmrHostConfig(server, version)).toEqual({
        hmr: { host: 'localhost', port: 24678 },
      })
    },
  )

  it.each([undefined, '7.3.1', '8.0.0', '8.1.0', '8.2.0'])(
    'preserves disabled HMR and WebSocket settings on Vite %s',
    (version) => {
      expect(getHmrHostConfig({ hmr: false }, version)).toBeUndefined()
      expect(getHmrHostConfig({ ws: false }, version)).toBeUndefined()
    },
  )
})

describe('pluginHMR config hook', () => {
  it.each([
    { context: undefined, key: 'hmr' },
    { context: { meta: {} }, key: 'hmr' },
    { context: { meta: { viteVersion: '8.0.0' } }, key: 'hmr' },
    { context: { meta: { viteVersion: '8.1.0' } }, key: 'ws' },
    { context: { meta: { viteVersion: '8.2.0' } }, key: 'ws' },
  ])('selects $key using context $context', async ({ context, key }) => {
    const [plugin] = [pluginHMR()].flat()
    const configHook = plugin.config
    if (typeof configHook !== 'function') throw new Error('Missing config hook')

    const result = await Reflect.apply(configHook, context, [
      {
        plugins: [
          pluginOptionsProvider({
            manifest: { manifest_version: 3, name: 'test', version: '1.0.0' },
          }),
        ],
      },
      { command: 'serve', mode: 'development' },
    ])

    expect(result).toEqual({ server: { [key]: { host: 'localhost' } } })
  })
})

describe('getChangedFilePath', () => {
  it('normalizes Windows file paths to content script ids', () => {
    const root = String.raw`D:\a\chrome-extension-tools\chrome-extension-tools\packages\vite-plugin\tests\e2e\mv3-dynamic-script-iife`
    const file = String.raw`D:\a\chrome-extension-tools\chrome-extension-tools\packages\vite-plugin\tests\e2e\mv3-dynamic-script-iife\src\main-world.ts`

    expect(getChangedFilePath(root, file)).toBe('/src/main-world.ts')
  })

  it('normalizes POSIX file paths to content script ids', () => {
    const root =
      '/home/runner/work/chrome-extension-tools/chrome-extension-tools/packages/vite-plugin/tests/e2e/mv3-dynamic-script-iife'
    const file = `${root}/src/main-world.ts`

    expect(getChangedFilePath(root, file)).toBe('/src/main-world.ts')
  })

  it('returns null for files outside the root', () => {
    expect(
      getChangedFilePath('/repo/project', '/repo/other/src/main-world.ts'),
    ).toBe(null)
    expect(
      getChangedFilePath(
        '/repo/project',
        '/repo/project-other/src/main-world.ts',
      ),
    ).toBe(null)
  })
})
