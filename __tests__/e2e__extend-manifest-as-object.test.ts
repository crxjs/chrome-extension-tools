import { OutputAsset, OutputChunk, rollup, RollupBuild } from 'rollup'
import { isAsset, isChunk } from '../src/helpers'
import { ChromeExtensionManifest } from '../src/manifest'
import { byFileName, getExtPath } from '../__fixtures__/utils'

const { default: config } = require(getExtPath('extend-manifest-as-object/rollup.config.js'))

let bundle: RollupBuild
let output: [OutputChunk, ...(OutputChunk | OutputAsset)[]]
let ready: Promise<void>
beforeAll(async () => {
  try {
    bundle = await rollup(config)

    ready = bundle.generate(config.output).then(({ output: o }) => {
      output = o
    })
  } catch (error) {
    console.error(error)
  }
}, 10000)

test('bundles chunks', async () => {
  expect(ready).toBeInstanceOf(Promise)
  await ready

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
    expect(ready).toBeDefined()
    await ready

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
  expect(ready).toBeDefined()
  await ready

  const manifestAsset = output.find(byFileName('manifest.json')) as OutputAsset
  const manifest = JSON.parse(manifestAsset.source as string) as ChromeExtensionManifest

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
