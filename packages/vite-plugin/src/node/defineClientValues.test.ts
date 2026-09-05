import { describe, expect, it } from 'vitest'
import { defineClientValues } from './defineClientValues'
import type { ResolvedConfigWithHMRToken } from './types'

const clientTemplate = [
  'protocol=__HMR_PROTOCOL__',
  'host=__HMR_HOSTNAME__',
  'port=__HMR_PORT__',
  'timeout=__HMR_TIMEOUT__',
  'overlay=__HMR_ENABLE_OVERLAY__',
].join('\n')

function createConfig(server: Record<string, unknown>) {
  return {
    base: '/',
    define: {},
    mode: 'development',
    server: {
      middlewareMode: false,
      port: 5173,
      ...server,
    },
  } as unknown as ResolvedConfigWithHMRToken
}

describe('defineClientValues', () => {
  it('reads WebSocket settings from Vite 8 without touching deprecated HMR fields', () => {
    const hmr = { overlay: false }
    for (const key of [
      'clientPort',
      'host',
      'path',
      'port',
      'protocol',
      'timeout',
    ]) {
      Object.defineProperty(hmr, key, {
        enumerable: true,
        get() {
          throw new Error(`deprecated HMR field ${key} was read`)
        },
      })
    }

    const result = defineClientValues(
      clientTemplate,
      createConfig({
        hmr,
        ws: {
          clientPort: 4321,
          host: 'ws-host',
          protocol: 'wss',
          timeout: 1234,
        },
      }),
      '8.2.0',
    )

    expect(result).toBe(
      [
        'protocol="wss"',
        'host="ws-host"',
        'port="4321"',
        'timeout=1234',
        'overlay=false',
      ].join('\n'),
    )
  })

  it.each([false, undefined])(
    'does not read deprecated HMR fields when server.ws is %s',
    (ws) => {
      const hmr = { overlay: false }
      Object.defineProperty(hmr, 'host', {
        get() {
          throw new Error('deprecated HMR host was read')
        },
      })

      const result = defineClientValues(
        clientTemplate,
        createConfig({ hmr, ...(ws === false ? { ws } : {}) }),
        '8.2.0',
      )

      expect(result).toBe(
        [
          'protocol=null',
          'host=null',
          'port="5173"',
          'timeout=30000',
          'overlay=false',
        ].join('\n'),
      )
    },
  )

  it.each([undefined, '3.2.11', '7.3.1', '8.0.0'])(
    'reads legacy HMR settings on Vite %s',
    (version) => {
      const result = defineClientValues(
        clientTemplate,
        createConfig({
          ws: undefined,
          hmr: {
            clientPort: 24679,
            host: 'legacy-host',
            overlay: false,
            protocol: 'ws',
            timeout: 5000,
          },
        }),
        version,
      )

      expect(result).toBe(
        [
          'protocol="ws"',
          'host="legacy-host"',
          'port="24679"',
          'timeout=5000',
          'overlay=false',
        ].join('\n'),
      )
    },
  )
})
