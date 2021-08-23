import { OutputAsset, OutputChunk, rollup, RollupOptions, RollupOutput } from 'rollup'
import { byFileName, requireExtFile } from '../../__fixtures__/utils'

const config = requireExtFile(__filename, 'rollup.config.js') as RollupOptions

let outputPromise: Promise<RollupOutput>
beforeAll(async () => {
  outputPromise = rollup(config).then((bundle) => bundle.generate(config.output as any))
  return outputPromise
}, 30000)

// SMELL: is this really necessary?
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

  expect(output.length).toBe(3)

  const manifest: chrome.runtime.ManifestV2 = JSON.parse(manifestJson.source as string)

  expect(manifest.background?.scripts).toEqual(['background1.js', 'background2.js'])
  expect(manifest.content_scripts).toBeUndefined()
  expect(manifest.web_accessible_resources).toBeUndefined()

  // TODO: test that contentJs.code is an iife
})
