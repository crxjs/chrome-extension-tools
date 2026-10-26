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
        __messageListener: () => undefined
        __nestedValue?: string
        __voices?: string[]
      }

      return {
        listeners: chrome.runtime.onMessage.hasListener(
          fixtureGlobal.__messageListener,
        ),
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
// Report the actual result when surveying Firefox compatibility.
const testRecursiveRegression =
  process.env.E2E_BROWSER === 'firefox' ? test : test.fails

testRecursiveRegression(
  'inlines recursive service worker dynamic imports with shared dependencies',
  async ({ expect }) => {
    const result = await buildFixture()
    // Firefox uses a background document, where native dynamic imports are valid.
    // Keep checking execution; only Chrome service workers require inlining.
    if (process.env.E2E_BROWSER !== 'firefox') {
      expect(result.output).toEqual({ dynamicImports: [], hasRawImport: false })
    }
    expect(result.state).toEqual({
      listeners: true,
      nestedValue: 'fixture-nested-import-ran',
      voices: ['fixture-Alice', 'fixture-Bob'],
    })
  },
)
