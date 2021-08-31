import {
  optionsHtml,
  srcDir,
} from '$test/helpers/mv2-kitchen-sink-paths'
import { getRelativePath } from '../cheerio'

test('returns correct path', () => {
  const getter = getRelativePath({
    filePath: optionsHtml,
    rootPath: srcDir,
  })

  expect(getter('options.js')).toBe(
    'test/examples/mv2-kitchen-sink/options.js',
  )
  expect(getter('options/options.js')).toBe(
    'test/examples/mv2-kitchen-sink/options/options.js',
  )
  expect(getter('../options.js')).toBe(
    'test/examples/options.js',
  )
})
