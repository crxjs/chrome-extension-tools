import { getRollupOutput } from '$test/helpers/getRollupOutput'
import { byFileName } from '$test/helpers/utils'
import { OutputAsset, OutputChunk } from 'rollup'

const outputPromise = getRollupOutput(
  __dirname,
  'rollup.config.js',
)

test('bundles a single content script as iife', async () => {
  const { output } = await outputPromise

  const contentJs = output.find(
    byFileName('content.js'),
  ) as OutputChunk
  const manifestJson = output.find(
    byFileName('manifest.json'),
  ) as OutputAsset

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

  const manifest = JSON.parse(
    manifestJson.source as string,
  ) as chrome.runtime.Manifest

  expect(manifest.background).toBeUndefined()
  expect(manifest.content_scripts?.[0]).toMatchObject({
    js: ['content.js'],
  })
  expect(manifest.web_accessible_resources).toBeUndefined()

  // TODO: test that contentJs.code is an iife
})
