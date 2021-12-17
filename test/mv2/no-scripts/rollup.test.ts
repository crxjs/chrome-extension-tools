import { stubId } from '$src/stubId'
import { getRollupOutput } from '$test/helpers/getRollupOutput'
import { jestSetTimeout } from '$test/helpers/timeout'
import { byFileName } from '$test/helpers/utils'
import { OutputAsset } from 'rollup'

jestSetTimeout(15000)

test('Handles extension with no scripts at all', async () => {
  const { output } = await getRollupOutput(
    __dirname,
    'rollup.config.js',
  )

  const stubChunk = output.find(byFileName(stubId))
  expect(stubChunk).toBeUndefined()

  const manifestAsset = output.find(
    byFileName('manifest.json'),
  ) as OutputAsset
  const manifestSource = manifestAsset.source as string
  const manifest = JSON.parse(
    manifestSource,
  ) as chrome.runtime.Manifest

  expect(manifest).toBeDefined()
  expect(manifest.content_scripts).toBeUndefined()
  expect(manifest.web_accessible_resources).toBeUndefined()
  expect(manifest.background).toBeUndefined()
})
