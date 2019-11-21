import { getRelativePath } from '../cheerio'
import { getExtPath } from '../../../__fixtures__/utils'

test('returns correct path', () => {
  const filePath = getExtPath('basic/options.html')
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
