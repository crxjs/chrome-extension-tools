import { getExtPath } from '../../../__fixtures__/utils'
import { loadHtml, getScriptSrc } from '../cheerio'

const html$ = loadHtml(getExtPath('basic/options.html'))

test('scrapes correct script tags', () => {
  const result = getScriptSrc(html$)

  expect(result).toEqual([
    '__fixtures__/extensions/basic/options1.js',
    '__fixtures__/extensions/basic/options2.jsx',
    '__fixtures__/extensions/basic/options3.ts',
    '__fixtures__/extensions/basic/options4.tsx',
  ])
})
