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
  expect(chunks.find(byFileName('content.js'))).toBeDefined()
  expect(chunks.find(byFileName('script.js'))).toBeDefined()

  // 2 entries and 1 content script wrapper
  expect(chunks.length).toBe(3)
})

test('bundles assets', async () => {
  const { output } = await outputPromise

  // Assets
  const assets = output.filter(isAsset)
  expect(assets.find(byFileName('manifest.json'))).toBeDefined()

  // 1 manifest
  expect(assets.length).toBe(1)
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
    if (chunk?.type === 'chunk') {
      expect(typeof chunk?.map?.toUrl()).toBe('string')
    }
  })
})
