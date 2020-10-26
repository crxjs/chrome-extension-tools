import { getExtPath, byFileName } from '../__fixtures__/utils'
import { rollup, RollupOutput, OutputAsset } from 'rollup'
import { ChromeExtensionManifest } from '../src/manifest'
import { inversePromise } from '../__fixtures__/inversePromise'

const { default: config } = require(getExtPath('not-recommended/rollup.config.js'))

const outputPromise = inversePromise<RollupOutput['output']>()
beforeAll(async () => {
  try {
    const bundle = await rollup(config)
    const { output } = await bundle.generate(config.output)
    outputPromise.resolve(output)
  } catch (error) {
    outputPromise.reject(error)
  }
}, 10000)

test('Handles background html page', async () => {
  const output = await outputPromise

  const backgroundHtml = output.find(byFileName('background.html'))
  const backgroundJs = output.find(byFileName('background.js'))

  expect(backgroundHtml).toBeDefined()
  expect(backgroundJs).toBeDefined()
})

test('Handles content scripts with only css', async () => {
  const output = await outputPromise

  const contentCss = output.find(byFileName('content.css'))

  expect(contentCss).toBeDefined()
})

test('Handles CSP in manifest.json', async () => {
  const output = await outputPromise

  const manifestJson = output.find(byFileName('manifest.json')) as OutputAsset

  const manifest = JSON.parse(manifestJson.source as string) as ChromeExtensionManifest

  expect(manifest.content_security_policy).toBe("script-src 'self'; object-src 'self'")
})
