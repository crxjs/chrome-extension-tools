import { getExtPath, byFileName } from '../__fixtures__/utils'
import { rollup, RollupOutput, OutputAsset } from 'rollup'
import { ChromeExtensionManifest } from '../src/manifest'

const { default: config } = require(getExtPath(
  'not-recommended/rollup.config.js',
))

// const manifestJson = getExtPath('not-recommended/manifest.json')
// const contentCss = getExtPath('not-recommended/content.css')
// const backgroundHtml = getExtPath(
//   'not-recommended/background.html',
// )

let output: RollupOutput['output']
beforeAll(async () => {
  const bundle = await rollup(config)
  const { output: o } = await bundle.generate(config.output)
  output = o
})

test('Handles background html page', () => {
  const backgroundHtml = output.find(
    byFileName('background.html'),
  )
  const backgroundJs = output.find(byFileName('background.js'))

  expect(backgroundHtml).toBeDefined()
  expect(backgroundJs).toBeDefined()
})

test('Handles content scripts with only css', () => {
  const contentCss = output.find(byFileName('content.css'))

  expect(contentCss).toBeDefined()
})

test('Handles CSP in manifest.json', () => {
  const manifestJson = output.find(
    byFileName('manifest.json'),
  ) as OutputAsset

  const manifest = JSON.parse(
    manifestJson.source as string,
  ) as ChromeExtensionManifest

  expect(manifest.content_security_policy).toBe(
    "script-src 'self'; object-src 'self'",
  )
})
