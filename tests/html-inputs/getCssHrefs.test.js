import path from 'path'
import assert from 'assert'

import fs from 'fs-extra'
import cheerio from 'cheerio'

import { getCssHrefs } from '../../src/html-inputs/cheerio.js'

const loadHtml = async (name) => {
  const fixtures = 'tests/html-inputs/fixtures'
  const popup = 'popup.html'
  const htmlPath = path.join(fixtures, name, popup)

  const html = await fs.readFile(htmlPath, 'utf8')

  return [htmlPath, cheerio.load(html)]
}

test('getCssHrefs', async () => {
  const name = 'with-styles'
  const param = await loadHtml(name)

  const cssHrefs = getCssHrefs(param)

  expect(cssHrefs).toBeInstanceOf(Array)
  expect(cssHrefs.length).toBe(1)

  assert(cssHrefs.some((s) => s.endsWith('popup.css')))
  assert(cssHrefs.every((s) => s.endsWith('.css')))
  assert(cssHrefs.every((s) => !s.endsWith('.html')))
})

// TODO: put together a fixture for each link type

// TODO: test link[href='http...']
test.todo('getCssHrefs should ignore http')

// TODO: test link[href='https...']
test.todo('getCssHrefs should ignore https')

// TODO: test link[href='data...']
test.todo('getCssHrefs should ignore data')

// TODO: test link[href='/...']
test.todo('getCssHrefs should ignore root-relative')

// TODO: test link[href='//...']
test.todo('getCssHrefs should ignore protocol-relative')
