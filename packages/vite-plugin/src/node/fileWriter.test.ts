import { describe, expect, test } from 'vitest'
import { getRollupInputOptions } from './fileWriter'

describe('getRollupInputOptions', () => {
  test('removes Rolldown-only options before calling CRXJS bundled Rollup', () => {
    // CRXJS calls its own Rollup dependency here, regardless of which Vite
    // version the user has installed.
    const rollupOptions = getRollupInputOptions({
      input: 'index.html',
      output: {
        format: 'es',
      },
      platform: 'browser',
      resolve: {},
      transform: {},
      moduleTypes: {},
      optimization: {},
      experimental: {},
      cwd: '/project',
    } as Parameters<typeof getRollupInputOptions>[0])

    expect(rollupOptions).toEqual({
      input: 'index.html',
      output: {
        format: 'es',
      },
    })
  })
})
