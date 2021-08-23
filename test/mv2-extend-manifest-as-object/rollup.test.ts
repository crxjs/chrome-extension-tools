import { isAsset, isChunk } from '$src/helpers'
import { OutputAsset, rollup, RollupOptions, RollupOutput } from 'rollup'
import { byFileName } from '../../__fixtures__/utils'

let outputPromise: Promise<RollupOutput>
beforeAll(async () => {
  const config = require('./rollup.config.js') as RollupOptions
  outputPromise = rollup(config).then((bundle) => bundle.generate(config.output as any))
  return outputPromise
}, 30000)

test('bundles chunks', async () => {
  const { output } = await outputPromise

  // Chunks
  const chunks = output.filter(isChunk)
  expect(chunks.length).toBe(3)

  // 2 chunks + one shared import (imported.js)
  expect(output.find(byFileName('background.js'))).toBeDefined()
  expect(output.find(byFileName('content.js'))).toBeDefined()
})

test(
  'bundles assets',
  async () => {
    const { output } = await outputPromise

    // Assets
    const assets = output.filter(isAsset)
    expect(assets.length).toBe(6)

    // 4 assets + 2 wrapper scripts
    expect(output.find(byFileName('images/icon-main-16.png'))).toBeDefined()
    expect(output.find(byFileName('images/icon-main-48.png'))).toBeDefined()
    expect(output.find(byFileName('images/icon-main-128.png'))).toBeDefined()
    expect(output.find(byFileName('manifest.json'))).toBeDefined()
  },
  5 * 60 * 1000,
)

test('extends the manifest', async () => {
  const { output } = await outputPromise

  const manifestAsset = output.find(byFileName('manifest.json')) as OutputAsset
  const manifest = JSON.parse(manifestAsset.source as string) as chrome.runtime.Manifest

  // Changes from extendManifest
  expect(manifest).toMatchObject({
    content_scripts: [
      expect.objectContaining({
        // Content script ESM wrapper
        js: [expect.stringMatching(/^assets\/content.+\.js$/)],
        matches: ['https://www.google.com/*'],
      }),
    ],
    description: 'properties from options.extendManifest are preferred',
  })

  // Original data from manifest.json
  expect(manifest).toMatchObject({
    background: {
      // Background script ESM wrapper
      scripts: [expect.stringMatching(/^assets\/background.+\.js$/)],
    },
    icons: {
      '16': 'images/icon-main-16.png',
      '48': 'images/icon-main-48.png',
      '128': 'images/icon-main-128.png',
    },
    manifest_version: 2,
    name: 'options.extendManifest as object',
    version: '1.0.0',
  })
})
