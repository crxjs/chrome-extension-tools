import { getExtPath } from '../../../__fixtures__/utils'
import { loadHtml } from '../cheerio'

const fs = require('fs-extra')
const cheerio = require('cheerio')

jest.spyOn(fs, 'readFileSync')
jest.spyOn(cheerio, 'load')

beforeEach(() => {
  jest.clearAllMocks()
})

test('calls readFileSync', () => {
  const filePath = getExtPath('basic/options.html')
  const result = loadHtml(filePath)

  expect(result).toBeInstanceOf(Function)
  expect(result).toHaveProperty('filePath', filePath)

  expect(fs.readFileSync).toBeCalledWith(filePath, 'utf8')
})

test('calls cheerio.load', () => {
  const filePath = getExtPath('basic/options.html')
  const htmlCode = fs.readFileSync(filePath, 'utf8')

  loadHtml(filePath)

  expect(cheerio.load).toBeCalledWith(htmlCode)
})
