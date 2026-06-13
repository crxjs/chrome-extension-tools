import type { CorsOptions, UserConfig } from 'vite'
import { expect, test } from 'vitest'
import { addExtensionCors, pluginExtensionCors } from './plugin-extensionCors'

type OriginFunction = (
  origin: string,
  cb: (err: Error | null, origin?: boolean) => void,
) => void

function originAllows(origin: CorsOptions['origin'], value: string): boolean {
  if (origin === true) return true
  if (typeof origin === 'string') return origin === value
  if (origin instanceof RegExp) return origin.test(value)
  if (Array.isArray(origin)) {
    return origin.some((item) => originAllows(item, value))
  }
  return false
}

function getOrigin(cors: CorsOptions | boolean): CorsOptions['origin'] {
  if (cors === true) return true
  if (cors === false) return undefined
  return cors.origin
}

function checkOrigin(origin: OriginFunction, value: string) {
  return new Promise<boolean | undefined>((resolve, reject) => {
    origin(value, (err, allowed) => {
      if (err) reject(err)
      else resolve(allowed)
    })
  })
}

async function runExtensionCorsConfig(config: UserConfig) {
  const hook = pluginExtensionCors().config

  if (typeof hook !== 'function') {
    throw new Error('Unable to find extension CORS config hook')
  }

  await hook.call({} as ThisParameterType<typeof hook>, config, {
    command: 'serve',
    mode: 'development',
  })
}

test('allows extension origins in dev server cors by default', () => {
  const origin = getOrigin(addExtensionCors(undefined))

  expect(originAllows(origin, 'chrome-extension://extension-id')).toBe(true)
  expect(originAllows(origin, 'moz-extension://extension-id')).toBe(true)
})

test('preserves user cors origins when adding extension origins', () => {
  const origin = getOrigin(
    addExtensionCors({
      origin: [/https:\/\/example\.com/],
    }),
  )

  expect(originAllows(origin, 'https://example.com')).toBe(true)
  expect(originAllows(origin, 'chrome-extension://extension-id')).toBe(true)
})

test('preserves cors true', () => {
  expect(addExtensionCors(true)).toBe(true)
})

test('preserves user cors origin functions', async () => {
  const origin = getOrigin(
    addExtensionCors({
      origin(requestOrigin, cb) {
        cb(null as unknown as Error, requestOrigin === 'https://example.com')
      },
    }),
  ) as OriginFunction

  await expect(checkOrigin(origin, 'chrome-extension://extension-id')).resolves.toBe(
    true,
  )
  await expect(checkOrigin(origin, 'https://example.com')).resolves.toBe(true)
  await expect(checkOrigin(origin, 'https://blocked.example')).resolves.toBe(
    false,
  )
})

test('plugin applies extension cors to dev server config', async () => {
  const config: UserConfig = {}

  await runExtensionCorsConfig(config)

  const origin = getOrigin(config.server!.cors!)
  expect(originAllows(origin, 'chrome-extension://extension-id')).toBe(true)
})
