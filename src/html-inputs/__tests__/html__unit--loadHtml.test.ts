import { optionsHtml } from '../../../__fixtures__/basic-paths'
import { loadHtml } from '../cheerio'

const fs = require('fs-extra')
const cheerio = require('cheerio')

jest.spyOn(fs, 'readFileSync')
jest.spyOn(cheerio, 'load')

beforeEach(() => {
  jest.clearAllMocks()
})

const filePath = optionsHtml
test('calls readFileSync', () => {
  const result = loadHtml(filePath)

  expect(result).toBeInstanceOf(Function)
  expect(result).toHaveProperty('filePath', filePath)

  expect(fs.readFileSync).toBeCalledWith(filePath, 'utf8')
})

test('calls cheerio.load', () => {
  const htmlCode = fs.readFileSync(filePath, 'utf8')

  loadHtml(filePath)

  expect(cheerio.load).toBeCalledWith(htmlCode)
})
