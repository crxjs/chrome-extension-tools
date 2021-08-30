import { isAsset, isChunk } from '$src/helpers'
import { deriveFiles } from '$src/manifest-input/manifest-parser'
import { byFileName } from '$test/helpers/utils'
import path from 'path'
import { RollupOutput } from 'rollup'
import { build } from 'vite'

jest.spyOn(console, 'log').mockImplementation(jest.fn())

let output: RollupOutput['output']
beforeAll(async () => {
  const { output: o } = (await build({
    configFile: path.join(__dirname, 'vite.config.ts'),
    envFile: false,
  })) as RollupOutput

  output = o
}, 30000)

test('bundles chunks', async () => {
  // Chunks
  const chunks = output.filter(isChunk)

  expect(
    chunks.find(byFileName('service_worker.js')),
  ).toBeDefined()
  expect(chunks.find(byFileName('content.js'))).toBeDefined()
  expect(chunks.find(byFileName('popup.js'))).toBeDefined()

  expect(chunks.length).toBe(3)
})

test('bundles assets', async () => {
  // Assets
  const assets = output.filter(isAsset)
  expect(assets.find(byFileName('manifest.json'))).toBeDefined()
  expect(assets.find(byFileName('popup.html'))).toBeDefined()
  expect(
    assets.find(byFileName('content.esm-wrapper.js')),
  ).toBeDefined()

  // 1 html file, 1 content script wrapper, and 1 manifest
  expect(assets.length).toBe(3)
})

test('chunks in output match chunks in manifest', async () => {
  const assets = output.filter(isAsset)
  const manifestJson = assets.find(byFileName('manifest.json'))!
  const manifest = JSON.parse(
    manifestJson.source as string,
  ) as chrome.runtime.Manifest

  // Get scripts in manifest
  const srcDir = path.resolve(__dirname, 'src')
  const { contentScripts } = deriveFiles(manifest, srcDir, {
    contentScripts: true,
  })

  contentScripts
    .map((x) => path.relative(srcDir, x))
    .forEach((script) => {
      const asset = output.find(byFileName(script))
      // TODO: need to update wrapper ext in updateMV3
      expect(asset).toBeDefined()
    })
})
