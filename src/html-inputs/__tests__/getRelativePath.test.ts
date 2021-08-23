import { getRelativePath } from '../cheerio'
import { optionsHtml } from '../../../test/helpers/mv2-kitchen-sink-paths'
import { getExtPath } from '../../../test/helpers/utils'

test('returns correct path', () => {
  const filePath = optionsHtml
  const rootPath = getExtPath('mv2-kitchen-sink')
  const getter = getRelativePath({ filePath, rootPath })

  expect(getter('options.js')).toBe(
    'helpers/extensions/mv2-kitchen-sink/options.js',
  )
  expect(getter('options/options.js')).toBe(
    'helpers/extensions/mv2-kitchen-sink/options/options.js',
  )
  expect(getter('../options.js')).toBe(
    'helpers/extensions/options.js',
  )
})
