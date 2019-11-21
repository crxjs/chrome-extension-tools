import { getRelativePath } from '../cheerio'
import { optionsHtml } from '../../../__fixtures__/basic-paths'

test('returns correct path', () => {
  const filePath = optionsHtml
  const getter = getRelativePath(filePath)

  expect(getter('options.js')).toBe(
    '__fixtures__/extensions/basic/options.js',
  )
  expect(getter('options/options.js')).toBe(
    '__fixtures__/extensions/basic/options/options.js',
  )
  expect(getter('../options.js')).toBe(
    '__fixtures__/extensions/options.js',
  )
})
