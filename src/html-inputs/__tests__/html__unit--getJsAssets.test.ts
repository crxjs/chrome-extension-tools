import { getExtPath } from '../../../__fixtures__/utils'
import { loadHtml, getJsAssets } from '../cheerio'

const html$ = loadHtml(getExtPath('basic/options.html'))

test('scrapes correct asset scripts', () => {
  const result = getJsAssets(html$)

  expect(result).toEqual([
    '__fixtures__/extensions/basic/asset.js',
  ])
})
