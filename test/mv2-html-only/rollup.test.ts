import { OutputAsset, rollup, RollupOptions, RollupOutput } from 'rollup'
import { byFileName } from '../../__fixtures__/utils'

let outputPromise: Promise<RollupOutput>
beforeAll(async () => {
  const config = require('./rollup.config.js') as RollupOptions
  outputPromise = rollup(config).then((bundle) => bundle.generate(config.output as any))
  return outputPromise
}, 30000)

test.skip('Handles extension only html and no scripts at all', async () => {
  const { output } = await outputPromise

  const manifestAsset = output.find(byFileName('manifest.json')) as OutputAsset
  const manifestSource = manifestAsset.source as string
  const manifest = JSON.parse(manifestSource) as chrome.runtime.Manifest

  expect(manifest).toBeDefined()
  expect(manifest.content_scripts).toBeUndefined()
  expect(manifest.web_accessible_resources).toBeUndefined()
  expect(manifest.background).toBeUndefined()
})
