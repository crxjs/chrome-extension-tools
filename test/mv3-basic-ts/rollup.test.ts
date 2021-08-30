import { isAsset, isChunk } from '$src/helpers'
import { getRollupOutput } from '$test/helpers/getRollupOutput'
import { byFileName } from '$test/helpers/utils'

const outputPromise = getRollupOutput(
  __dirname,
  'rollup.config.js',
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
