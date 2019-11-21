import { getExtPath } from '../../../__fixtures__/utils'
import { loadHtml, getJsAssets } from '../cheerio'
import { optionsHtml } from '../../../__fixtures__/basic-paths'

const html$ = loadHtml(optionsHtml)

test('scrapes correct asset scripts', () => {
  const result = getJsAssets(html$)

  expect(result).toEqual([
    '__fixtures__/extensions/basic/asset.js',
  ])
})
