import { OutputAsset, OutputChunk } from 'rollup'
// import cheerio from 'cheerio'
// import cases from 'jest-in-case'

import { isAsset, isChunk } from '../src/helpers'
import { ChromeExtensionManifest } from '../src/manifest'
import { buildCRX } from '../__fixtures__/build-basic-crx'
import { byFileName, getExtPath } from '../__fixtures__/utils'

let output: [OutputChunk, ...(OutputChunk | OutputAsset)[]]
let CRXBuildError: string | undefined
beforeAll(
  buildCRX(getExtPath('browser-polyfill/rollup.config.js'), (error, result) => {
    if (error) {
      CRXBuildError = error.message
    } else if (result && result.output.output) {
      output = result.output.output
    } else {
      CRXBuildError = 'Could not build CRX'
    }
  }),
  10000,
)

test('bundles chunks', () => {
  expect(CRXBuildError).toBeUndefined()

  // Chunks
  const chunks = output.filter(isChunk)
  expect(chunks.length).toBe(5)

  // 4 chunks + one shared import (shared.js)
  expect(output.find(byFileName('scripts/background.js'))).toBeDefined()
  expect(output.find(byFileName('scripts/content.js'))).toBeDefined()
  expect(output.find(byFileName('options/options.js'))).toBeDefined()
  expect(output.find(byFileName('popup/popup.js'))).toBeDefined()
})

test('bundles assets', () => {
  expect(CRXBuildError).toBeUndefined()

  // Assets
  const assets = output.filter(isAsset)
  expect(assets.length).toBe(15)

  // 11 assets + 2 wrapper scripts + 2 browser polyfills
  expect(output.find(byFileName('assets/browser-polyfill-executeScript.js'))).toBeDefined()
  expect(output.find(byFileName('assets/browser-polyfill.js'))).toBeDefined()
  expect(output.find(byFileName('scripts/content.css'))).toBeDefined()
  expect(output.find(byFileName('images/favicon.ico'))).toBeDefined()
  expect(output.find(byFileName('images/favicon.png'))).toBeDefined()
  expect(output.find(byFileName('images/icon-main-16.png'))).toBeDefined()
  expect(output.find(byFileName('images/icon-main-48.png'))).toBeDefined()
  expect(output.find(byFileName('images/icon-main-128.png'))).toBeDefined()
  expect(output.find(byFileName('images/options.jpg'))).toBeDefined()
  expect(output.find(byFileName('manifest.json'))).toBeDefined()
  expect(output.find(byFileName('options/options.css'))).toBeDefined()
  expect(output.find(byFileName('options/options.html'))).toBeDefined()
  expect(output.find(byFileName('popup/popup.html'))).toBeDefined()
})

test('includes browser polyfill in manifest.json', () => {
  expect(CRXBuildError).toBeUndefined()

  const manifestAsset = output.find(byFileName('manifest.json')) as OutputAsset
  const manifestSource = manifestAsset.source as string
  const manifest: ChromeExtensionManifest = JSON.parse(manifestSource)

  expect(manifest.background?.scripts?.[0]).toBe('assets/browser-polyfill.js')
  expect(manifest.background?.scripts?.[1]).toBe('assets/browser-polyfill-executeScript.js')

  manifest.content_scripts?.forEach(({ js = [] }) => {
    expect(js[0]).toBe('assets/browser-polyfill.js')
    expect(js[1]).not.toBe('assets/browser-polyfill-executeScript.js')
  })
})

// cases(
//   'includes browser polyfill in html pages',
//   ({ pagePath, headScriptsLength }) => {
//     expect(CRXBuildError).toBeUndefined()

//     const asset = output.find(byFileName(pagePath)) as OutputAsset
//     const source = asset.source as string
//     const $ = cheerio.load(source)
//     const headScripts = $('head').children('script')

//     expect(headScripts.length).toBe(headScriptsLength)
//     expect(headScripts.first().attr('src')).toBe('/assets/browser-polyfill.js')
//     expect(headScripts.next().attr('src')).toBe('/assets/browser-polyfill-executeScript.js')
//   },
//   [
//     { name: 'options page', pagePath: 'options/options.html', headScriptsLength: 2 },
//     { name: 'popup page', pagePath: 'popup/popup.html', headScriptsLength: 3 },
//   ],
// )
