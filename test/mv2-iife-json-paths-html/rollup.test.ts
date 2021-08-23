import { getRollupOutput } from '$test/helpers/getRollupOutput'
import { byFileName } from '$test/helpers/utils'
import { OutputAsset, OutputChunk } from 'rollup'

const outputPromise = getRollupOutput(
  __dirname,
  'rollup.config.js',
)

// SMELL: is this really necessary?
test('bundles both background and content scripts as iife', async () => {
  const { output } = await outputPromise

  const backgroundJs = output.find(
    byFileName('background/background.js'),
  ) as OutputChunk
  const contentJs = output.find(
    byFileName('content/content.js'),
  ) as OutputChunk
  const optionsJs = output.find(
    byFileName('options/options.js'),
  ) as OutputChunk
  const optionsHtml = output.find(
    byFileName('options/options.html'),
  ) as OutputAsset
  const manifestJson = output.find(
    byFileName('manifest.json'),
  ) as OutputAsset

  expect(output.length).toBe(5)

  expect(backgroundJs).toBeDefined()
  expect(backgroundJs).toMatchObject<Partial<OutputChunk>>({
    code: expect.any(String),
    fileName: 'background/background.js',
    type: 'chunk',
  })

  expect(contentJs).toBeDefined()
  expect(contentJs).toMatchObject<Partial<OutputChunk>>({
    code: expect.any(String),
    fileName: 'content/content.js',
    type: 'chunk',
  })

  expect(optionsJs).toBeDefined()
  expect(optionsJs).toMatchObject<Partial<OutputChunk>>({
    code: expect.any(String),
    fileName: 'options/options.js',
    type: 'chunk',
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

  const manifest: chrome.runtime.ManifestV2 = JSON.parse(
    manifestJson.source as string,
  )

  expect(manifest.background?.scripts).toEqual([
    'background/background.js',
  ])
  expect(manifest.content_scripts?.[0]).toMatchObject({
    js: ['content/content.js'],
  })
  expect(manifest.web_accessible_resources).toBeUndefined()

  // TODO: test that contentJs.code is an iife
})
