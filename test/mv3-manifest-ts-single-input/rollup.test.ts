import { isAsset, isChunk } from '$src/helpers'
import { deriveFiles } from '$src/manifest-input/manifest-parser'
import { getRollupOutput } from '$test/helpers/getRollupOutput'
import { byFileName } from '$test/helpers/utils'
import path from 'path'

const outputPromise = getRollupOutput(
  path.join(__dirname, 'rollup.config.js'),
)

test('bundles chunks and assets', async () => {
  const { output } = await outputPromise

  // Chunks
  const chunks = output.filter(isChunk)
  expect(
    chunks.find(byFileName('service_worker.js')),
  ).toBeDefined()
  expect(chunks.find(byFileName('content.js'))).toBeDefined()
  expect(chunks.find(byFileName('popup.js'))).toBeDefined()

  // 3 entries
  expect(chunks.length).toBe(3)
})

test('bundles assets', async () => {
  const { output } = await outputPromise

  // Assets
  const assets = output.filter(isAsset)
  expect(assets.find(byFileName('manifest.json'))).toBeDefined()
  expect(assets.find(byFileName('popup.html'))).toBeDefined()
  expect(
    assets.find(byFileName('content.esm-wrapper.js')),
  ).toBeDefined()

  // 1 html file and 1 manifest and 1 content script wrapper
  expect(assets.length).toBe(3)
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
    if (chunk?.type === 'chunk') {
      expect(typeof chunk?.map?.toUrl()).toBe('string')
    }
  })
})
