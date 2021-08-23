import { getRollupOutput } from '$test/helpers/getRollupOutput'
import { byFileName } from '$test/helpers/utils'
import { OutputAsset, OutputChunk } from 'rollup'

const outputPromise = getRollupOutput(
  __dirname,
  'rollup.config.js',
)

test('bundles multiple content scripts as iife', async () => {
  const { output } = await outputPromise

  const content1Js = output.find(
    byFileName('content1.js'),
  ) as OutputChunk
  const content2Js = output.find(
    byFileName('content2.js'),
  ) as OutputChunk
  const manifestJson = output.find(
    byFileName('manifest.json'),
  ) as OutputAsset

  expect(content1Js).toBeDefined()
  expect(content1Js).toMatchObject({
    code: expect.any(String),
    fileName: 'content1.js',
    type: 'chunk',
  })

  expect(content2Js).toBeDefined()
  expect(content2Js).toMatchObject({
    code: expect.any(String),
    fileName: 'content2.js',
    type: 'chunk',
  })

  expect(manifestJson).toBeDefined()
  expect(manifestJson).toMatchObject({
    source: expect.any(String),
    fileName: 'manifest.json',
    type: 'asset',
  })

  expect(output.length).toBe(3)

  const manifest = JSON.parse(
    manifestJson.source as string,
  ) as chrome.runtime.Manifest

  expect(manifest.background).toBeUndefined()
  expect(manifest.content_scripts?.[0]).toMatchObject({
    js: ['content1.js'],
  })
  expect(manifest.content_scripts?.[1]).toMatchObject({
    js: ['content2.js'],
  })
  expect(manifest.web_accessible_resources).toBeUndefined()

  // TODO: test that contentJs.code is an iife
})
