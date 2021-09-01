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
  expect(chunks.find(byFileName('content.js'))).toBeDefined()
  expect(chunks.find(byFileName('script.js'))).toBeDefined()

  // 2 entries and 1 content script wrapper
  expect(chunks.length).toBe(2)
})

test('bundles assets', async () => {
  const { output } = await outputPromise

  // Assets
  const assets = output.filter(isAsset)
  expect(assets.find(byFileName('manifest.json'))).toBeDefined()

  // 1 manifest
  expect(assets.length).toBe(1)
})
