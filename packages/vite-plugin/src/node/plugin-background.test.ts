import type { CorsOptions, UserConfig } from 'vite'
import { expect, test } from 'vitest'
import { pluginBackground } from './plugin-background'
import { pluginOptionsProvider } from './plugin-optionsProvider'

const manifest = {
  manifest_version: 3,
  name: 'test extension',
  version: '0.0.0',
} as const

async function runBackgroundConfig(config: UserConfig) {
  const backgroundPlugin = [pluginBackground()]
    .flat()
    .find((plugin) => plugin.name === 'crx:background-loader-file')

  if (typeof backgroundPlugin?.config !== 'function') {
    throw new Error('Unable to find background config hook')
  }

  await backgroundPlugin.config(config, {
    command: 'serve',
    mode: 'development',
  })
}

function originAllows(origin: CorsOptions['origin'], value: string): boolean {
  if (origin === true) return true
  if (typeof origin === 'string') return origin === value
  if (origin instanceof RegExp) return origin.test(value)
  if (Array.isArray(origin)) {
    return origin.some((item) => originAllows(item, value))
  }
  return false
}

test('allows extension origins in dev server cors by default', async () => {
  const config: UserConfig = {
    plugins: [pluginOptionsProvider({ manifest })],
  }

  await runBackgroundConfig(config)

  const cors = config.server?.cors as CorsOptions
  expect(originAllows(cors.origin, 'chrome-extension://extension-id')).toBe(true)
  expect(originAllows(cors.origin, 'moz-extension://extension-id')).toBe(true)
})

test('preserves user cors origins when adding extension origins', async () => {
  const config: UserConfig = {
    plugins: [pluginOptionsProvider({ manifest })],
    server: {
      cors: {
        origin: [/https:\/\/example\.com/],
      },
    },
  }

  await runBackgroundConfig(config)

  const cors = config.server?.cors as CorsOptions
  expect(originAllows(cors.origin, 'https://example.com')).toBe(true)
  expect(originAllows(cors.origin, 'chrome-extension://extension-id')).toBe(true)
})
