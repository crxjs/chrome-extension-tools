import { isAsset, isChunk } from '$src/helpers'
import { getRollupOutput } from '$test/helpers/getRollupOutput'
import { jestSetTimeout } from '$test/helpers/timeout'
import { byFileName } from '$test/helpers/utils'

jestSetTimeout(30000)

process.chdir(__dirname)

test('bundles chunks', async () => {
  const { output } = await getRollupOutput(
    __dirname,
    'rollup.config.js',
  )

  // Chunks
  const chunks = output.filter(isChunk)

  expect(chunks.find(byFileName('background.js'))).toBeDefined()
  expect(chunks.find(byFileName('content.js'))).toBeDefined()
  expect(chunks.find(byFileName('popup.js'))).toBeDefined()

  expect(chunks.length).toBe(3)

  // Assets
  const assets = output.filter(isAsset)

  expect(assets.find(byFileName('manifest.json'))).toBeDefined()
  expect(assets.find(byFileName('popup.html'))).toBeDefined()
  const backgroundEsmWrapper = assets.find(
    byFileName('background.esm-wrapper.js'),
  )
  expect(backgroundEsmWrapper).toBeDefined()
  expect(backgroundEsmWrapper?.source).toMatch(
    '/** backgroundEsmWrapper */',
  )

  // 1 dynamic import wrapper, an html file, and the manifest
  expect(assets.length).toBe(3)
})
