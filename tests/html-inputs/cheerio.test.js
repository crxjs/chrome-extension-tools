import path from 'path'
import assert from 'assert'

import fs from 'fs-extra'
import cheerio from 'cheerio'

import sinon from 'sinon'

import { loadHtml } from '../../src/html-inputs/cheerio.js'

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
