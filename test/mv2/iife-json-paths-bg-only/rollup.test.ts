import { getRollupOutput } from '$test/helpers/getRollupOutput'
import { OutputAsset, OutputChunk } from 'rollup'
import { byFileName } from '$test/helpers/utils'

const outputPromise = getRollupOutput(
  __dirname,
  'rollup.config.js',
)

// SMELL: is this really necessary?
test('bundles a single background script as iife', async () => {
  const { output } = await outputPromise

  const backgroundJs = output.find(
    byFileName('background.js'),
  ) as OutputChunk
  const manifestJson = output.find(
    byFileName('manifest.json'),
  ) as OutputAsset

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

  const manifest: chrome.runtime.ManifestV2 = JSON.parse(
    manifestJson.source as string,
  )

  expect(manifest.background?.scripts).toEqual(['background.js'])
  expect(manifest.content_scripts).toBeUndefined()
  expect(manifest.web_accessible_resources).toBeUndefined()

  // TODO: test that backgroundJs.code is an iife
})
