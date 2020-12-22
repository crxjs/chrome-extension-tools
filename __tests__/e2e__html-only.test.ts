import { OutputAsset, rollup, RollupOptions, RollupOutput } from 'rollup'
import { ChromeExtensionManifest } from '../src/manifest'
import { byFileName, requireExtFile } from '../__fixtures__/utils'

let outputPromise: Promise<RollupOutput>
beforeAll(async () => {
  const config = requireExtFile<RollupOptions>(__filename, 'rollup.config.js')
  outputPromise = rollup(config).then((bundle) => bundle.generate(config.output as any))
  return outputPromise
}, 15000)

test.skip('Handles extension only html and no scripts at all', async () => {
  const { output } = await outputPromise

  const manifestAsset = output.find(byFileName('manifest.json')) as OutputAsset
  const manifestSource = manifestAsset.source as string
  const manifest = JSON.parse(manifestSource) as ChromeExtensionManifest

  expect(manifest).toBeDefined()
  expect(manifest.content_scripts).toBeUndefined()
  expect(manifest.web_accessible_resources).toBeUndefined()
  expect(manifest.background).toBeUndefined()
})
