import { isAsset, isChunk } from '$src/helpers'
import { deriveFiles } from '$src/manifest-input/manifest-parser'
import { byFileName } from '$test/helpers/utils'
import path from 'path'
import { RollupOutput } from 'rollup'
import { build } from 'vite'

jest.spyOn(console, 'log').mockImplementation(jest.fn())

let outputPromise: Promise<RollupOutput>
beforeAll(async () => {
  outputPromise = build({
    configFile: path.join(__dirname, 'vite.config.ts'),
    envFile: false,
  }) as typeof outputPromise
})

test('bundles chunks and assets', async () => {
  const { output } = await outputPromise

  // Chunks
  const chunks = output.filter(isChunk)
  expect(
    chunks.find(byFileName('service_worker.js')),
  ).toBeDefined()
  expect(chunks.find(byFileName('content.js'))).toBeDefined()
  expect(chunks.find(byFileName('popup.js'))).toBeDefined()

  // 3 scripts + 1 content script wrapper
  expect(chunks.length).toBe(4)
})

test('bundles assets', async () => {
  const { output } = await outputPromise

  // Assets
  const assets = output.filter(isAsset)
  expect(assets.find(byFileName('manifest.json'))).toBeDefined()
  expect(assets.find(byFileName('popup.html'))).toBeDefined()

  // 1 html file and the manifest
  expect(assets.length).toBe(2)
})

test('entries in manifest match entries in output', async () => {
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
