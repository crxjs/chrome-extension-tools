import path from 'path'
import assert from 'assert'

import fs from 'fs-extra'
import cheerio from 'cheerio'

import { getJsAssets } from '../../src/html-inputs/cheerio.js'

const loadHtml = async (name) => {
  const fixtures = 'tests/html-inputs/fixtures'
  const popup = 'popup.html'
  const htmlPath = path.join(fixtures, name, popup)

  const html = await fs.readFile(htmlPath, 'utf8')

  return [htmlPath, cheerio.load(html)]
}

test('getJsAssets', async () => {
  const name = 'with-assets'
  const param = await loadHtml(name)

  const jsAssets = getJsAssets(param)

  expect(jsAssets).toBeInstanceOf(Array)
  expect(jsAssets.length).toBe(1)

  assert(jsAssets.some((s) => s.endsWith('react.js')))
  assert(jsAssets.every((s) => s.endsWith('.js')))
  assert(jsAssets.every((s) => !s.endsWith('.html')))
})

// TODO: put together a fixture for each link type

// TODO: test script[src='http...']
test.todo('getJsAssets should ignore http')

// TODO: test script[src='https...']
test.todo('getJsAssets should ignore https')

// TODO: test script[src='data...']
test.todo('getJsAssets should ignore data')

// TODO: test script[src='/...']
test.todo('getJsAssets should ignore root-relative')

// TODO: test script[src='//...']
test.todo('getJsAssets should ignore protocol-relative')
