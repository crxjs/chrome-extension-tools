import { getRollupOutput } from '$test/helpers/getRollupOutput'
import { OutputAsset } from 'rollup'
import { byFileName } from '$test/helpers/utils'
import { jestSetTimeout } from '$test/helpers/timeout'

jestSetTimeout(15000)

test('Handles background html page', async () => {
  const { output } = await getRollupOutput(
    __dirname,
    'rollup.config.js',
  )

  const backgroundHtml = output.find(
    byFileName('background.html'),
  )
  const backgroundJs = output.find(byFileName('background.js'))

  expect(backgroundHtml).toBeDefined()
  expect(backgroundJs).toBeDefined()

  const contentCss = output.find(byFileName('content.css'))

  expect(contentCss).toBeDefined()

  const manifestJson = output.find(
    byFileName('manifest.json'),
  ) as OutputAsset

  const manifest = JSON.parse(
    manifestJson.source as string,
  ) as chrome.runtime.Manifest

  expect(manifest.content_security_policy).toBe(
    "script-src 'self'; object-src 'self'",
  )
})
