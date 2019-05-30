import path from 'path'
import assert from 'assert'

import fs from 'fs-extra'
import cheerio from 'cheerio'

import { getJsEntries } from '../../src/html-inputs/cheerio.js'

const loadHtml = async (name) => {
  const fixtures = 'tests/html-inputs/fixtures'
  const popup = 'popup.html'
  const htmlPath = path.join(fixtures, name, popup)

  const html = await fs.readFile(htmlPath, 'utf8')

  return [htmlPath, cheerio.load(html)]
}

test('getJsEntries', async () => {
  const name = 'with-assets'
  const param = await loadHtml(name)

  const jsEntries = getJsEntries(param)

  expect(jsEntries).toBeInstanceOf(Array)
  expect(jsEntries.length).toBe(1)

  assert(jsEntries.some((s) => s.endsWith('popup.js')))
  assert(jsEntries.every((s) => s.endsWith('.js')))
  assert(jsEntries.every((s) => !s.endsWith('.html')))
})

// TODO: put together a fixture for each link type

// TODO: test script[src='http...']
test.todo('getJsEntries should ignore http')

// TODO: test script[src='https...']
test.todo('getJsEntries should ignore https')

// TODO: test script[src='data...']
test.todo('getJsEntries should ignore data')

// TODO: test script[src='/...']
test.todo('getJsEntries should ignore root-relative')

// TODO: test script[src='//...']
test.todo('getJsEntries should ignore protocol-relative')
