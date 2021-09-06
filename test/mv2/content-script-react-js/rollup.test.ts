import { isAsset, isChunk } from '$src/helpers'
import { getRollupOutput } from '$test/helpers/getRollupOutput'
import { byFileName } from '$test/helpers/utils'

const outputPromise = getRollupOutput(
  __dirname,
  'rollup.config.js',
)

test('bundles chunks', async () => {
  const { output } = await outputPromise

  // Chunks
  const chunks = output.filter(isChunk)
  expect(
    chunks.find(byFileName('content1/index.js')),
  ).toBeDefined()
  expect(
    chunks.find(byFileName('content2/index.js')),
  ).toBeDefined()
  expect(
    chunks.find(byFileName('pages/popup/index.js')),
  ).toBeDefined()

  // 3 chunks
  expect(chunks.length).toBe(3)
})

test('bundles assets', async () => {
  const { output } = await outputPromise

  // Assets
  const assets = output.filter(isAsset)
  expect(assets.find(byFileName('manifest.json'))).toBeDefined()

  expect(
    assets.find(byFileName('pages/popup/index.html')),
  ).toBeDefined()

  // an html file and the manifest
  expect(assets.length).toBe(2)
})
