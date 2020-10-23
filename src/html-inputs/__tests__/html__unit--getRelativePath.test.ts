import { getRelativePath } from '../cheerio'
import { optionsHtml } from '../../../__fixtures__/basic-paths'
import { getExtPath } from '../../../__fixtures__/utils'

test('returns correct path', () => {
  const filePath = optionsHtml
  const rootPath = getExtPath('basic')
  const getter = getRelativePath({ filePath, rootPath })

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
