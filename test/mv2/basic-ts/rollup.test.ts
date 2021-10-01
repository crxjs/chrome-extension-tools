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
    chunks.find(byFileName('background/index.js')),
  ).toBeDefined()
  expect(
    chunks.find(byFileName('content/index.js')),
  ).toBeDefined()
  expect(
    chunks.find(byFileName('pages/popup/index.js')),
  ).toBeDefined()

  // 2 chunks + one shared import (imported.js)
  expect(chunks.length).toBe(3)

  // Assets
  const assets = output.filter(isAsset)
  expect(assets.find(byFileName('manifest.json'))).toBeDefined()
  expect(
    assets.find(byFileName('background/index.esm-wrapper.js')),
  ).toBeDefined()
  expect(
    assets.find(byFileName('pages/popup/index.html')),
  ).toBeDefined()

  // 1 background esm wrapper, an html file, and the manifest
  expect(assets.length).toBe(3)
})
