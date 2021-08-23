import { isAsset, isChunk } from '$src/helpers'
import { deriveFiles } from '$src/manifest-input/manifest-parser'
import path from 'path'
import { rollup, RollupOptions, RollupOutput } from 'rollup'
import { byFileName } from '../helpers/utils'

let outputPromise: Promise<RollupOutput>
beforeAll(async () => {
  const config = require('./rollup.config.js') as RollupOptions
  outputPromise = rollup(config).then((bundle) =>
    bundle.generate(config.output as any),
  )
  return outputPromise
}, 30000)

test('bundles chunks and assets', async () => {
  const { output } = await outputPromise

  // Chunks
  const chunks = output.filter(isChunk)
  expect(chunks.length).toBe(3)
  // 2 chunks + one shared import (imported.js)
  expect(
    chunks.find(byFileName('background/index.js')),
  ).toBeDefined()
  expect(
    chunks.find(byFileName('content/index.js')),
  ).toBeDefined()
  expect(
    chunks.find(byFileName('pages/popup/index.js')),
  ).toBeDefined()
})

test('bundles assets', async () => {
  const { output } = await outputPromise

  // Assets
  const assets = output.filter(isAsset)
  expect(assets.length).toBe(4)
  // 2 dynamic import wrappers, an html file, and the manifest
  const manifestJson = assets.find(byFileName('manifest.json'))
  expect(manifestJson).toBeDefined()

  expect(
    assets.find(byFileName('pages/popup/index.html')),
  ).toBeDefined()
})

test('chunks in output match chunks in manifest', async () => {
  const { output } = await outputPromise

  const assets = output.filter(isAsset)
  const manifestJson = assets.find(byFileName('manifest.json'))!
  const manifest = JSON.parse(
    manifestJson.source as string,
  ) as chrome.runtime.Manifest

  // Get scripts in manifest
  const srcDir = path.join(__dirname, 'src')
  const { js } = deriveFiles(manifest, srcDir, {
    contentScripts: true,
  })

  js.map((x) => path.relative(srcDir, x)).forEach((script) => {
    const chunk = output.find(byFileName(script))
    expect(chunk).toBeDefined()
  })
})
