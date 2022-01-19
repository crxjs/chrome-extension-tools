import { isAsset, isChunk } from '$src/helpers'
import { getRollupOutput } from '$test/helpers/getRollupOutput'
import { jestSetTimeout } from '$test/helpers/timeout'
import { byFileName } from '$test/helpers/utils'

jestSetTimeout(30000)

test('bundles chunks and assets', async () => {
  const { output } = await getRollupOutput(
    __dirname,
    'rollup.config.js',
  )

  // Chunks
  const manifest = 'manifest.json'
  const background = 'background.js'
  const content = 'content.js'
  const executed = 'executed-script.js'
  const dynamic = 'dynamic-script.js'

  // Chunks
  const chunks = output.filter(isChunk)
  expect(chunks.find(byFileName(background))).toBeDefined()
  expect(chunks.find(byFileName(content))).toBeDefined()
  expect(chunks.find(byFileName(dynamic))).toBeDefined()
  expect(chunks.find(byFileName(executed))).toBeDefined()
  expect(chunks.length).toBe(4)

  // Assets
  const assets = output.filter(isAsset)
  expect(assets.find(byFileName(manifest))).toBeDefined()
  expect(assets.length).toBe(1)
})
