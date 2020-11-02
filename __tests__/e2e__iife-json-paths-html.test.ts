import { byFileName, requireExtFile } from '../__fixtures__/utils'
import { rollup, RollupOutput, OutputAsset } from 'rollup'
import { ChromeExtensionManifest } from '../src/manifest'
import { RollupOptions } from 'rollup'

const config = requireExtFile<RollupOptions>(__filename, 'rollup.config.js')

let outputPromise: Promise<RollupOutput>
beforeAll(async () => {
  outputPromise = rollup(config).then((bundle) => bundle.generate(config.output as any))
  return outputPromise
}, 10000)

test('bundles both background and content scripts as iife', async () => {
  const { output } = await outputPromise

  const backgroundJs = output.find(byFileName('background/background.js')) as OutputAsset
  const contentJs = output.find(byFileName('content/content.js')) as OutputAsset
  const optionsJs = output.find(byFileName('options/options.js')) as OutputAsset
  const optionsHtml = output.find(byFileName('options/options.html')) as OutputAsset
  const manifestJson = output.find(byFileName('manifest.json')) as OutputAsset

  expect(output.length).toBe(5)

  expect(backgroundJs).toBeDefined()
  expect(backgroundJs).toMatchObject({
    source: expect.any(String),
    fileName: 'background/background.js',
    type: 'asset',
  })

  expect(contentJs).toBeDefined()
  expect(contentJs).toMatchObject({
    source: expect.any(String),
    fileName: 'content/content.js',
    type: 'asset',
  })
  
  expect(optionsJs).toBeDefined()
  expect(optionsJs).toMatchObject({
    source: expect.any(String),
    fileName: 'options/options.js',
    type: 'asset',
  })

  expect(optionsHtml).toBeDefined()
  expect(optionsHtml).toMatchObject({
    source: expect.any(String),
    fileName: 'options/options.html',
    type: 'asset',
  })

  expect(manifestJson).toBeDefined()
  expect(manifestJson).toMatchObject({
    source: expect.any(String),
    fileName: 'manifest.json',
    type: 'asset',
  })

  const manifest = JSON.parse(manifestJson.source as string) as ChromeExtensionManifest

  expect(manifest.background?.scripts).toEqual(['background/background.js'])
  expect(manifest.content_scripts?.[0]).toMatchObject({
    js: ['content/content.js'],
  })
  expect(manifest.web_accessible_resources).toBeUndefined()

  // TODO: test that contentJs.code is an iife
})
