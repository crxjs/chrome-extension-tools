import {
  kitchenSinkRoot,
  optionsHtml,
} from '../../../__fixtures__/mv2-kitchen-sink-paths'
import { getJsAssets, loadHtml } from '../cheerio'

const html$ = loadHtml(kitchenSinkRoot)(optionsHtml)

test('scrapes correct asset scripts', () => {
  const result = getJsAssets(html$)

  expect(result).toEqual(['__fixtures__/extensions/mv2-kitchen-sink/asset.js'])
})
