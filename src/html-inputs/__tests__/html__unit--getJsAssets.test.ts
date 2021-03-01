import {
  kitchenSinkRoot,
  optionsHtml,
} from '../../../__fixtures__/kitchen-sink-paths'
import { getJsAssets, loadHtml } from '../cheerio'

const html$ = loadHtml(kitchenSinkRoot)(optionsHtml)

test('scrapes correct asset scripts', () => {
  const result = getJsAssets(html$)

  expect(result).toEqual([
    '__fixtures__/extensions/kitchen-sink/asset.js',
  ])
})
