import { byFileName, requireExtFile } from '../__fixtures__/utils'
import { rollup, RollupOutput, OutputAsset } from 'rollup'
import { ChromeExtensionManifest } from '../src/manifest'
import { OutputChunk } from 'rollup'
import { RollupOptions } from 'rollup'

const config = requireExtFile<RollupOptions>(__filename, 'rollup.config.js')

let outputPromise: Promise<RollupOutput>
beforeAll(async () => {
  outputPromise = rollup(config).then((bundle) => bundle.generate(config.output as any))
  return outputPromise
}, 10000)

test('bundles multiple background scripts as iife', async () => {
  const { output } = await outputPromise

  const background1Js = output.find(byFileName('background1.js')) as OutputChunk
  const background2Js = output.find(byFileName('background2.js')) as OutputChunk
  const manifestJson = output.find(byFileName('manifest.json')) as OutputAsset

  expect(background1Js).toBeDefined()
  expect(background1Js).toMatchObject({
    code: expect.any(String),
    fileName: 'background1.js',
    type: 'chunk',
  })

  expect(background2Js).toBeDefined()
  expect(background2Js).toMatchObject({
    code: expect.any(String),
    fileName: 'background2.js',
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
