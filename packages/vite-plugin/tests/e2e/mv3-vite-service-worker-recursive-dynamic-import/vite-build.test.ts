import type { OutputChunk } from 'rollup'
import { test } from 'vitest'
import { getServiceWorker } from '../helpers'
import { build } from '../runners'

interface WorkerState {
  listeners: boolean
  nestedValue?: string
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
        __nestedValue?: string
        __voices?: string[]
      }

      return {
        listeners: chrome.runtime.onMessage.hasListeners(),
        nestedValue: fixtureGlobal.__nestedValue,
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

// TODO(#1235): replace `test.fails` with `test` after recursively inlining
// service worker dynamic imports and their preload dependencies.
test.fails(
  'inlines recursive service worker dynamic imports with shared dependencies',
  async ({ expect }) => {
    expect(await buildFixture()).toEqual({
      output: {
        dynamicImports: [],
        hasRawImport: false,
      },
      state: {
        listeners: true,
        nestedValue: 'fixture-nested-import-ran',
        voices: ['fixture-Alice', 'fixture-Bob'],
      },
    })
  },
)
