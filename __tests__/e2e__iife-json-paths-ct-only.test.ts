import { OutputChunk } from 'rollup'
import { OutputAsset, rollup, RollupOptions, RollupOutput } from 'rollup'
import { ChromeExtensionManifest } from '../src/manifest'
import { byFileName, requireExtFile } from '../__fixtures__/utils'

const config = requireExtFile<RollupOptions>(__filename, 'rollup.config.js')

let outputPromise: Promise<RollupOutput>
beforeAll(async () => {
  outputPromise = rollup(config).then((bundle) => bundle.generate(config.output as any))
  return outputPromise
}, 15000)

test('bundles a single content script as iife', async () => {
  const { output } = await outputPromise

  const contentJs = output.find(byFileName('content.js')) as OutputChunk
  const manifestJson = output.find(byFileName('manifest.json')) as OutputAsset

  expect(contentJs).toBeDefined()
  expect(contentJs).toMatchObject({
    code: expect.any(String),
    fileName: 'content.js',
    type: 'chunk',
  })

  expect(manifestJson).toBeDefined()
  expect(manifestJson).toMatchObject({
    source: expect.any(String),
    fileName: 'manifest.json',
    type: 'asset',
  })

  const manifest = JSON.parse(manifestJson.source as string) as ChromeExtensionManifest

  expect(manifest.background).toBeUndefined()
  expect(manifest.content_scripts?.[0]).toMatchObject({
    js: ['content.js'],
  })
  expect(manifest.web_accessible_resources).toBeUndefined()

  // TODO: test that contentJs.code is an iife
})
