import { OutputAsset, OutputChunk, rollup, RollupOptions, RollupOutput } from 'rollup'
import { byFileName, requireExtFile } from '../../__fixtures__/utils'

const config = requireExtFile(__filename, 'rollup.config.js') as RollupOptions

let outputPromise: Promise<RollupOutput>
beforeAll(async () => {
  outputPromise = rollup(config).then((bundle) => bundle.generate(config.output as any))
  return outputPromise
}, 30000)

// SMELL: is this really necessary?
test('bundles both background and content scripts as iife', async () => {
  const { output } = await outputPromise

  const backgroundJs = output.find(byFileName('background/background.js')) as OutputChunk
  const contentJs = output.find(byFileName('content/content.js')) as OutputChunk
  const manifestJson = output.find(byFileName('manifest.json')) as OutputAsset

  // TODO: remove chunks that only are used by iife entries
  expect(output.length).toBe(3)

  expect(backgroundJs).toBeDefined()
  expect(backgroundJs).toMatchObject({
    code: expect.any(String),
    fileName: 'background/background.js',
    type: 'chunk',
  })

  expect(contentJs).toBeDefined()
  expect(contentJs).toMatchObject({
    code: expect.any(String),
    fileName: 'content/content.js',
    type: 'chunk',
  })

  expect(manifestJson).toBeDefined()
  expect(manifestJson).toMatchObject({
    source: expect.any(String),
    fileName: 'manifest.json',
    type: 'asset',
  })

  const manifest: chrome.runtime.ManifestV2 = JSON.parse(manifestJson.source as string)

  expect(manifest.background?.scripts).toEqual(['background/background.js'])
  expect(manifest.content_scripts?.[0]).toMatchObject({
    js: ['content/content.js'],
  })
  expect(manifest.web_accessible_resources).toBeUndefined()

  // TODO: test that contentJs.code is an iife
})
