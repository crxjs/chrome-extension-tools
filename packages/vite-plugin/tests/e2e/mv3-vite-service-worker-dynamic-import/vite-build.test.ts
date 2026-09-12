import type { OutputChunk } from 'rollup'
import { test } from 'vitest'
import { version } from 'vite'
import { getServiceWorker } from '../helpers'
import { build } from '../runners'

interface WorkerState {
  importCaught?: boolean
  listeners: boolean
  staticSeed?: string
  voices?: string[]
}

async function buildFixture() {
  const { browser, output } = await build(__dirname)
  if (!('output' in output)) throw new TypeError('Expected Rollup output')

  const background = output.output.find(
    (item): item is OutputChunk =>
      item.type === 'chunk' &&
      item.facadeModuleId?.endsWith('/src/background.ts') === true,
  )
  const worker = await getServiceWorker(browser, { timeout: 15_000 })

  let state: WorkerState = { listeners: false }
  if (worker) {
    await new Promise((resolve) => setTimeout(resolve, 250))
    state = await worker.evaluate(() => {
      const fixtureGlobal = globalThis as typeof globalThis & {
        __importCaught?: boolean
        __staticSeed?: string
        __voices?: string[]
      }

      return {
        importCaught: fixtureGlobal.__importCaught,
        listeners: chrome.runtime.onMessage.hasListeners(),
        staticSeed: fixtureGlobal.__staticSeed,
        voices: fixtureGlobal.__voices,
      }
    })
  }

  return {
    output: {
      dynamicImports: background?.dynamicImports,
      hasRawImport: /\bimport\s*\(/.test(background?.code ?? ''),
    },
    state,
  }
}

const viteMajor = Number.parseInt(version.split('.')[0], 10)

// TODO(#1235): use `test` unconditionally after preventing Vite's preload
// helper from aborting service workers when dynamic data is shared by entries.
const testVite8Regression = viteMajor >= 8 ? test.fails : test

testVite8Regression(
  'keeps listeners when dynamic data is shared with a content script',
  async ({ expect }) => {
    expect(await buildFixture()).toEqual({
      output: {
        dynamicImports: [],
        hasRawImport: false,
      },
      state: {
        importCaught: undefined,
        listeners: true,
        staticSeed: 'statically-seeded',
        voices: ['Alice', 'Bob'],
      },
    })
  },
)
