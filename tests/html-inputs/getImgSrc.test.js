import path from 'path'
import assert from 'assert'

import fs from 'fs-extra'
import cheerio from 'cheerio'

import { getImgSrcs } from '../../src/html-inputs/cheerio.js'

const loadHtml = async (name) => {
  const fixtures = 'tests/html-inputs/fixtures'
  const popup = 'popup.html'
  const htmlPath = path.join(fixtures, name, popup)

  const html = await fs.readFile(htmlPath, 'utf8')

  return [htmlPath, cheerio.load(html)]
}

test('getImgSrc', async () => {
  const name = 'with-image'
  const param = await loadHtml(name)

  const imageSrcs = getImgSrcs(param)

  expect(imageSrcs).toBeInstanceOf(Array)
  expect(imageSrcs.length).toBe(2)

  assert(imageSrcs.every((s) => s.endsWith('.png')))
  assert(imageSrcs.every((s) => !s.endsWith('.html')))

  const image =
    'tests/html-inputs/fixtures/with-image/images/icon-on-16.png'
  const favicon =
    'tests/html-inputs/fixtures/with-image/images/favicon.png'

  assert(imageSrcs.includes(image))
  assert(imageSrcs.includes(favicon))
})

// TODO: put together a fixture for each link type

// TODO: test img[src='http...']
// TODO: test link[href='http...']
test.todo('getImgSrc should ignore http')

// TODO: test img[src='https...']
// TODO: test link[href='https...']
test.todo('getImgSrc should ignore https')

// TODO: test img[src='data...']
// TODO: test link[href='data...']
test.todo('getImgSrc should ignore data')

// TODO: test img[src='/...']
// TODO: test link[href='/...']
test.todo('getImgSrc should ignore root-relative')

// TODO: test img[src='/...']
// TODO: test link[href='/...']
test.todo('getImgSrc should ignore protocol-relative')

// TODO: test img[src='/...']
// TODO: test link[href='/...']
test.todo('getImgSrc should ignore root-relative')
