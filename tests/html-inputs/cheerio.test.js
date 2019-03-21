import path from 'path'
import assert from 'assert'

import fs from 'fs-extra'
import cheerio from 'cheerio'

import sinon from 'sinon'

import {
  loadHtml,
  getCssLinks,
  getJsEntries,
} from '../../src/html-inputs/cheerio.js'

afterEach(() => {
  sinon.restore()
})

test('loadHtml', () => {
  const contents = 'html file!'
  const filePath = 'tests/fixtures/basic/popup.html'

  const readStub = sinon
    .stub(fs, 'readFileSync')
    .returns(contents)

  const loadStub = sinon.stub(cheerio, 'load')

  loadHtml(filePath)

  assert(readStub.calledOnce)
  assert(readStub.calledWith(filePath, 'utf8'))

  assert(loadStub.calledOnce)
  assert(loadStub.calledWith(contents))
})

test('getJsEntries', async () => {
  const popupHtml = await fs.readFile(
    path.join('tests/html-inputs/fixtures/basic/popup.html'),
    'utf8',
  )

  const $ = cheerio.load(popupHtml)

  const result = getJsEntries($)

  expect(result).toContain('popup.js')
  expect(result.length).toBe(1)
})

test('getCssLinks', async () => {
  const popupHtml = await fs.readFile(
    path.join(
      'tests/html-inputs/fixtures/unsupported/popup.html',
    ),
    'utf8',
  )

  const $ = cheerio.load(popupHtml)

  const result = getCssLinks($)

  expect(result).toContain('popup.css')
  expect(result.length).toBe(1)
})
