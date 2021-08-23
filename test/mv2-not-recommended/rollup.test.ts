import {
  OutputAsset,
  rollup,
  RollupOptions,
  RollupOutput,
} from 'rollup'
import { byFileName } from '../helpers/utils'

const config = require('./rollup.config.js') as RollupOptions

let outputPromise: Promise<RollupOutput>
beforeAll(async () => {
  outputPromise = rollup(config).then((bundle) =>
    bundle.generate(config.output as any),
  )
  return outputPromise
}, 30000)

test('Handles background html page', async () => {
  const { output } = await outputPromise

  const backgroundHtml = output.find(
    byFileName('background.html'),
  )
  const backgroundJs = output.find(byFileName('background.js'))

  expect(backgroundHtml).toBeDefined()
  expect(backgroundJs).toBeDefined()
})

test('Handles content scripts with only css', async () => {
  const { output } = await outputPromise

  const contentCss = output.find(byFileName('content.css'))

  expect(contentCss).toBeDefined()
})

test('Handles CSP in manifest.json', async () => {
  const { output } = await outputPromise

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
