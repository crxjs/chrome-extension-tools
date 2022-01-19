import { ManifestV3 } from '$src'
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
  const chunks = output.filter(isChunk)

  const backgroundJs = chunks.find(byFileName('background.js'))!
  expect(backgroundJs).toBeDefined()
  expect(backgroundJs.code).toMatchSnapshot()

  const contentJs = chunks.find(byFileName('content.js'))!
  expect(contentJs).toBeDefined()
  expect(contentJs.code).toMatchSnapshot()

  const popupJs = chunks.find(byFileName('popup.js'))!
  expect(popupJs).toBeDefined()
  expect(popupJs.code).toMatchSnapshot()

  // 3 scripts
  expect(chunks.length).toBe(3)

  // Assets
  const assets = output.filter(isAsset)
  const manifestJson = assets.find(byFileName('manifest.json'))!
  expect(manifestJson).toBeDefined()
  const manifest = JSON.parse(
    manifestJson.source as string,
  ) as ManifestV3
  expect(manifest).toMatchSnapshot()

  const popupHtml = assets.find(byFileName('popup.html'))!
  expect(popupHtml).toBeDefined()
  expect(popupHtml.source!).toMatchSnapshot()

  // html file, content script wrapper, and the manifest
  expect(assets.length).toBe(3)
})
