import { isAsset, isChunk } from '$src/helpers'
import { getScriptSrc, loadHtml } from '$src/html-inputs/cheerio'
import { deriveFiles } from '$src/manifest-input/manifest-parser'
import { flatten } from 'lodash'
import path from 'path'
import {
  OutputAsset,
  rollup,
  RollupOptions,
  RollupOutput,
} from 'rollup'
import {
  byFileName,
  getExtPath,
  getTestName,
} from '../helpers/utils'

const testName = getTestName(__filename)
const extPath = getExtPath(testName)

let outputPromise: Promise<RollupOutput>
beforeAll(async () => {
  const config = require('./rollup.config.js') as RollupOptions
  outputPromise = rollup(config).then((bundle) =>
    bundle.generate(config.output as any),
  )
  return outputPromise
}, 30000)

test('bundles chunks', async () => {
  const { output } = await outputPromise

  // Chunks
  const chunks = output.filter(isChunk)
  expect(chunks.length).toBe(10)
  // 9 chunks + one shared import (imported.js)
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

  const imported = output.find(({ fileName }) =>
    fileName.includes('imported'),
  )
  // Chunk name should not be double hashed
  expect(imported?.fileName).toMatch(/^imported-[a-z0-9]+?\.js$/)
})

test('bundles assets', async () => {
  const { output } = await outputPromise

  // Assets
  const assets = output.filter(isAsset)
  expect(assets.length).toBe(21)

  // 17 assets + 2 wrapper scripts
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
  expect(output.find(byFileName('options.html'))).toBeDefined()
  expect(output.find(byFileName('options.css'))).toBeDefined()
  expect(output.find(byFileName('content.css'))).toBeDefined()
  expect(output.find(byFileName('options.png'))).toBeDefined()
  expect(output.find(byFileName('options.jpg'))).toBeDefined()
  expect(output.find(byFileName('manifest.json'))).toBeDefined()

  expect(
    output.find(byFileName('fonts/NotoSans-Light.ttf')),
  ).toBeDefined()
  expect(
    output.find(byFileName('fonts/NotoSans-Black.ttf')),
  ).toBeDefined()
  expect(
    output.find(byFileName('fonts/Missaali-Regular.otf')),
  ).toBeDefined()

  expect(
    output.find(byFileName('_locales/en/messages.json')),
  ).toBeDefined()
  expect(
    output.find(byFileName('_locales/es/messages.json')),
  ).toBeDefined()
})

test('Includes content script imports in web_accessible_resources', async () => {
  const { output } = await outputPromise

  const manifestAsset = output.find(
    byFileName('manifest.json'),
  ) as OutputAsset
  const manifestSource = manifestAsset.source as string
  const manifest: chrome.runtime.Manifest = JSON.parse(
    manifestSource,
  )

  expect(manifest).toMatchObject({
    web_accessible_resources: expect.arrayContaining([
      'content.js',
      expect.stringMatching(/imported-.+?\.js/),
    ]),
  })
})

test('Includes content_security_policy untouched', async () => {
  const { output } = await outputPromise

  const manifestAsset = output.find(
    byFileName('manifest.json'),
  ) as OutputAsset
  const manifestSource = manifestAsset.source as string
  const manifest: chrome.runtime.Manifest = JSON.parse(
    manifestSource,
  )

  expect(manifest).toMatchObject({
    content_security_policy:
      "script-src 'self'; object-src 'self'",
  })
})

test('chunks in output match chunks in manifest', async () => {
  const { output } = await outputPromise

  const assets = output.filter(isAsset)
  const manifestJson = assets.find(byFileName('manifest.json'))!
  const manifest = JSON.parse(
    manifestJson.source as string,
  ) as chrome.runtime.Manifest

  // Get scripts in manifest
  const { js, html } = deriveFiles(manifest, extPath, {
    contentScripts: true,
  })
  const html$ = html.map(loadHtml(extPath))
  const htmlJs = flatten(html$.map(getScriptSrc)).map((x) => {
    const { name, dir } = path.parse(x)

    return path.join(dir, `${name}.js`)
  })

  js.concat(htmlJs)
    .map((x) => path.relative(extPath, x))
    .forEach((script) => {
      const chunk = output.find(byFileName(script))
      expect(chunk).toBeDefined()
    })
})

// TODO: emit assets shared by manifest and html files one time only
test.todo('Emits assets in both manifest and html files once')
