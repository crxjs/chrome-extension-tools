import path from 'path'
import assert from 'assert'

import fs from 'fs-extra'
import cheerio from 'cheerio'

import {
  getJsEntries,
  getCssHrefs,
  getImgSrc,
  getJsAssets,
} from '../../src/html-inputs/cheerio.js'

const loadHtml = async name => {
  const fixtures = 'tests/html-inputs/fixtures'
  const popup = 'popup.html'
  const htmlPath = path.join(fixtures, name, popup)

  const html = await fs.readFile(htmlPath, 'utf8')

  return [htmlPath, cheerio.load(html)]
}

test('getJsEntries', async () => {
  const name = 'basic'
  const param = await loadHtml(name)

  const result = getJsEntries(param)

  expect(result).toBeInstanceOf(Array)
  expect(result.length).toBe(2)

  const [htmlPath, jsEntries] = result

  assert(htmlPath.includes(name))
  assert(htmlPath.endsWith('.html'))

  expect(jsEntries).toBeInstanceOf(Array)
  expect(jsEntries.length).toBe(1)
  assert(jsEntries.some(s => s.endsWith('popup.js')))
})

test('getJsAssets', async () => {
  const name = 'with-assets'
  const param = await loadHtml(name)

  const result = getJsAssets(param)

  expect(result).toBeInstanceOf(Array)
  expect(result.length).toBe(2)

  const [htmlPath, jsAssets] = result

  assert(htmlPath.includes(name))
  assert(htmlPath.endsWith('.html'))

  expect(jsAssets).toBeInstanceOf(Array)
  expect(jsAssets.length).toBe(1)
  assert(jsAssets.some(s => s.endsWith('react.js')))
})

test('getCssHrefs', async () => {
  const name = 'with-styles'
  const param = await loadHtml(name)

  const result = getCssHrefs(param)

  expect(result).toBeInstanceOf(Array)
  expect(result.length).toBe(2)

  const [htmlPath, cssHrefs] = result

  assert(htmlPath.includes(name))
  assert(htmlPath.endsWith('.html'))

  expect(cssHrefs).toBeInstanceOf(Array)
  expect(cssHrefs.length).toBe(1)

  assert(cssHrefs.some(s => s.endsWith('popup.css')))
})

test('getImgSrc', async () => {
  const name = 'with-image'
  const param = await loadHtml(name)

  const result = getImgSrc(param)

  expect(result).toBeInstanceOf(Array)
  expect(result.length).toBe(2)

  const [htmlPath, imageSrcs] = result

  assert(htmlPath.includes(name))
  assert(htmlPath.endsWith('.html'))

  expect(imageSrcs).toBeInstanceOf(Array)
  expect(imageSrcs.length).toBe(2)

  const image =
    'tests/html-inputs/fixtures/with-image/images/icon-on-16.png'
  const favicon =
    'tests/html-inputs/fixtures/with-image/images/favicon.png'

  assert(imageSrcs.includes(image))
  assert(imageSrcs.includes(favicon))
})
