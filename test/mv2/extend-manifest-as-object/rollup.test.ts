import { isAsset, isChunk } from '$src/helpers'
import { getRollupOutput } from '$test/helpers/getRollupOutput'
import { byFileName } from '$test/helpers/utils'
import { OutputAsset } from 'rollup'

test('bundles extended manifest', async () => {
  const { output } = await getRollupOutput(
    __dirname,
    'rollup.config.js',
  )

  const manifestAsset = output.find(
    byFileName('manifest.json'),
  ) as OutputAsset
  const manifest = JSON.parse(
    manifestAsset.source as string,
  ) as chrome.runtime.Manifest
  expect(manifest).toMatchSnapshot()

  // Chunks
  const chunks = output.filter(isChunk)

  expect(output.find(byFileName('background.js'))).toBeDefined()
  expect(output.find(byFileName('content.js'))).toBeDefined()

  // 2 entries + 1 chunk
  expect(chunks.length).toBe(3)

  // Assets
  const assets = output.filter(isAsset)

  expect(output.find(byFileName('manifest.json'))).toBeDefined()
  expect(
    output.find(byFileName('background.esm-wrapper.js')),
  ).toBeDefined()

  expect(
    output.find(byFileName('images/icon-main-16.png')),
  ).toBeDefined()
  expect(
    output.find(byFileName('images/icon-main-48.png')),
  ).toBeDefined()
  expect(
    output.find(byFileName('images/icon-main-128.png')),
  ).toBeDefined()

  // 2 esm wrappers, manifest, 3 images
  expect(assets.length).toBe(6)
})
