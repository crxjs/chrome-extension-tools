import path from 'path'
import { rollup, RollupOptions, RollupOutput } from 'rollup'
import { isAsset, isChunk } from '../src/helpers'
import { deriveFiles } from '../src/manifest-input/manifest-parser'
import { byFileName, getExtPath, getTestName, requireExtFile } from '../__fixtures__/utils'

const testName = getTestName(__filename)
const extPath = getExtPath(testName)

let outputPromise: Promise<RollupOutput>
beforeAll(async () => {
  const config = requireExtFile(__filename, 'rollup.config.js') as RollupOptions
  outputPromise = rollup(config).then((bundle) => bundle.generate(config.output as any))
  return outputPromise
}, 30000)

test('bundles chunks and assets', async () => {
  const { output } = await outputPromise

  // Chunks
  const chunks = output.filter(isChunk)
  expect(chunks.length).toBe(4)
  // 3 chunks + one shared import (imported.js)
  expect(chunks.find(byFileName('content1/index.js'))).toBeDefined()
  expect(chunks.find(byFileName('content2/index.js'))).toBeDefined()
  expect(chunks.find(byFileName('pages/popup/index.js'))).toBeDefined()
})

test('bundles assets', async () => {
  const { output } = await outputPromise

  // Assets
  const assets = output.filter(isAsset)
  expect(assets.length).toBe(4)
  // 2 dynamic import wrappers, an html file, and the manifest
  const manifestJson = assets.find(byFileName('manifest.json'))
  expect(manifestJson).toBeDefined()

  expect(assets.find(byFileName('pages/popup/index.html'))).toBeDefined()
})

test('chunks in output match chunks in manifest', async () => {
  const { output } = await outputPromise

  const assets = output.filter(isAsset)
  const manifestJson = assets.find(byFileName('manifest.json'))!
  const manifest = JSON.parse(manifestJson.source as string) as chrome.runtime.Manifest

  // Get scripts in manifest
  const { js } = deriveFiles(manifest, extPath, { contentScripts: true })

  js.map((x) => path.relative(extPath, x)).forEach((script) => {
    const chunk = output.find(byFileName(script))
    expect(chunk).toBeDefined()
  })
})
