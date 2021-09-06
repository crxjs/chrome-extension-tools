import { isAsset, isChunk } from '$src/helpers'
import { getRollupOutput } from '$test/helpers/getRollupOutput'
import { byFileName } from '$test/helpers/utils'
import { OutputAsset } from 'rollup'

const outputPromise = getRollupOutput(
  __dirname,
  'rollup.config.js',
)

test('bundles chunks', async () => {
  const { output } = await outputPromise

  // Chunks
  const chunks = output.filter(isChunk)

  expect(output.find(byFileName('background.js'))).toBeDefined()
  expect(output.find(byFileName('content.js'))).toBeDefined()
  expect(output.find(byFileName('options1.js'))).toBeDefined()
  expect(output.find(byFileName('options2.js'))).toBeDefined()
  expect(output.find(byFileName('options3.js'))).toBeDefined()
  expect(output.find(byFileName('options4.js'))).toBeDefined()
  expect(output.find(byFileName('popup/popup.js'))).toBeDefined()
  expect(
    output.find(byFileName('devtools/devtools1.js')),
  ).toBeDefined()
  expect(
    output.find(byFileName('devtools/devtools2.js')),
  ).toBeDefined()

  // 9 chunks + one shared import (imported.js)
  expect(chunks.length).toBe(10)
})

test('bundles assets', async () => {
  const { output } = await outputPromise

  // Assets
  const assets = output.filter(isAsset)

  expect(output.find(byFileName('manifest.json'))).toBeDefined()
  expect(
    output.find(byFileName('background.esm-wrapper.js')),
  ).toBeDefined()

  expect(output.find(byFileName('options.html'))).toBeDefined()
  expect(output.find(byFileName('options.css'))).toBeDefined()
  expect(output.find(byFileName('content.css'))).toBeDefined()
  expect(output.find(byFileName('options.png'))).toBeDefined()
  expect(output.find(byFileName('options.jpg'))).toBeDefined()

  expect(output.find(byFileName('asset.js'))).toBeDefined()
  expect(
    output.find(byFileName('popup/popup.html')),
  ).toBeDefined()
  expect(
    output.find(byFileName('devtools/devtools.html')),
  ).toBeDefined()
  expect(
    output.find(byFileName('images/icon-main-16.png')),
  ).toBeDefined()
  expect(
    output.find(byFileName('images/icon-main-48.png')),
  ).toBeDefined()
  expect(
    output.find(byFileName('images/icon-main-128.png')),
  ).toBeDefined()
  expect(
    output.find(byFileName('images/favicon.ico')),
  ).toBeDefined()
  expect(
    output.find(byFileName('images/favicon.png')),
  ).toBeDefined()

  expect(
    output.find(byFileName('fonts/NotoSans-Light.ttf')),
  ).toBeDefined()
  expect(
    output.find(byFileName('fonts/NotoSans-Black.ttf')),
  ).toBeDefined()
  expect(
    output.find(byFileName('fonts/Missaali-Regular.otf')),
  ).toBeDefined()

  // 17 assets + 2 wrapper scripts
  expect(assets.length).toBe(18)
})

test('Includes content_security_policy untouched', async () => {
  const { output } = await outputPromise

  const manifestAsset = output.find(
    byFileName('manifest.json'),
  ) as OutputAsset
  const manifestSource = manifestAsset.source as string
  const manifest: chrome.runtime.Manifest =
    JSON.parse(manifestSource)

  expect(manifest).toMatchObject({
    content_security_policy:
      "script-src 'self'; object-src 'self'",
  })
})

test.todo('Emits assets in both manifest and html files once')
