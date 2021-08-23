import { isAsset, isChunk } from '$src/helpers'
import { deriveFiles } from '$src/manifest-input/manifest-parser'
import path from 'path'
import { rollup, RollupOptions, RollupOutput } from 'rollup'
import { byFileName, getExtPath, getTestName } from '../../__fixtures__/utils'

const testName = getTestName(__filename)
const extPath = getExtPath(testName)

let outputPromise: Promise<RollupOutput>
beforeAll(async () => {
  const config = require('./rollup.config.js') as RollupOptions
  outputPromise = rollup(config).then((bundle) => bundle.generate(config.output as any))
  return outputPromise
}, 30000)

test('bundles chunks and assets', async () => {
  const { output } = await outputPromise

  // Chunks
  const chunks = output.filter(isChunk)
  expect(chunks.length).toBe(3)
  // 2 chunks + one shared import (imported.js)
  expect(chunks.find(byFileName('background/background.js'))).toBeDefined()
  expect(chunks.find(byFileName('content/content.js'))).toBeDefined()

  const imported = chunks.find(({ fileName }) => fileName.includes('imported'))
  // Chunk should be in correct folder and not be double hashed
  expect(imported?.fileName).toMatch(/^chunks\/imported-[a-z0-9]+?\.js$/)
})

test('bundles assets', async () => {
  const { output } = await outputPromise

  // Assets
  const assets = output.filter(isAsset)
  expect(assets.length).toBe(3)
  // 2 dynamic import wrappers and the manifest
  const manifestJson = assets.find(byFileName('manifest.json'))
  expect(manifestJson).toBeDefined()
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
