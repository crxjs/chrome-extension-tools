import { getRelativePath } from '../cheerio'
import { optionsHtml } from '../../../__fixtures__/mv2-kitchen-sink-paths'
import { getExtPath } from '../../../__fixtures__/utils'

test('returns correct path', () => {
  const filePath = optionsHtml
  const rootPath = getExtPath('mv2-kitchen-sink')
  const getter = getRelativePath({ filePath, rootPath })

  expect(getter('options.js')).toBe(
    '__fixtures__/extensions/mv2-kitchen-sink/options.js',
  )
  expect(getter('options/options.js')).toBe(
    '__fixtures__/extensions/mv2-kitchen-sink/options/options.js',
  )
  expect(getter('../options.js')).toBe('__fixtures__/extensions/options.js')
})
