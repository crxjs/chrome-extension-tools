import {
  basicRoot,
  optionsHtml,
} from '../../../__fixtures__/basic-paths'
import { getScriptSrc, loadHtml } from '../cheerio'

const html$ = loadHtml(basicRoot)(optionsHtml)

test('scrapes correct script tags', () => {
  const result = getScriptSrc(html$)

  expect(result).toEqual([
    '__fixtures__/extensions/basic/options1.js',
    '__fixtures__/extensions/basic/options2.jsx',
    '__fixtures__/extensions/basic/options3.ts',
    '__fixtures__/extensions/basic/options4.tsx',
  ])
})
