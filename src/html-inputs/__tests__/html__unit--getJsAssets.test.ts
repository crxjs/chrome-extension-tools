import { optionsHtml } from '../../../__fixtures__/basic-paths'
import { getJsAssets, loadHtml } from '../cheerio'

const html$ = loadHtml(optionsHtml)

test('scrapes correct asset scripts', () => {
  const result = getJsAssets(html$)

  expect(result).toEqual([
    '__fixtures__/extensions/basic/asset.js',
  ])
})
