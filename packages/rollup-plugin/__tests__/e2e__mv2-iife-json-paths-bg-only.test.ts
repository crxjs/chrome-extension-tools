import { byFileName, requireExtFile } from '../__fixtures__/utils'
import { rollup, RollupOutput, OutputAsset } from 'rollup'
import { RollupOptions } from 'rollup'
import { OutputChunk } from 'rollup'

const config = requireExtFile(__filename, 'rollup.config.js') as RollupOptions

let outputPromise: Promise<RollupOutput>
beforeAll(async () => {
  outputPromise = rollup(config).then((bundle) => bundle.generate(config.output as any))
  return outputPromise
}, 45000)

// SMELL: is this really necessary?
test('bundles a single background script as iife', async () => {
  const { output } = await outputPromise

  const backgroundJs = output.find(byFileName('background.js')) as OutputChunk
  const manifestJson = output.find(byFileName('manifest.json')) as OutputAsset

  expect(backgroundJs).toBeDefined()
  expect(backgroundJs).toMatchObject({
    code: expect.any(String),
    fileName: 'background.js',
    type: 'chunk',
  })

  expect(manifestJson).toBeDefined()
  expect(manifestJson).toMatchObject({
    source: expect.any(String),
    fileName: 'manifest.json',
    type: 'asset',
  })

  const manifest: chrome.runtime.ManifestV2 = JSON.parse(manifestJson.source as string)

  expect(manifest.background?.scripts).toEqual(['background.js'])
  expect(manifest.content_scripts).toBeUndefined()
  expect(manifest.web_accessible_resources).toBeUndefined()

  // TODO: test that backgroundJs.code is an iife
})
