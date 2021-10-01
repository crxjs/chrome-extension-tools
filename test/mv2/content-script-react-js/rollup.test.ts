import { isAsset, isChunk } from '$src/helpers'
import { getRollupOutput } from '$test/helpers/getRollupOutput'
import { jestSetTimeout } from '$test/helpers/timeout'
import { byFileName } from '$test/helpers/utils'

jestSetTimeout(30000)

test('bundles chunks', async () => {
  const { output } = await getRollupOutput(
    __dirname,
    'rollup.config.js',
  )

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

  // Assets
  const assets = output.filter(isAsset)
  expect(assets.find(byFileName('manifest.json'))).toBeDefined()

  expect(
    assets.find(byFileName('pages/popup/index.html')),
  ).toBeDefined()

  // an html file and the manifest
  expect(assets.length).toBe(2)
})
