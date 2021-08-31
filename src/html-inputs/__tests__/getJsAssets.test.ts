import {
  kitchenSinkRoot,
  optionsHtml,
} from '$test/helpers/mv2-kitchen-sink-paths'
import { getJsAssets, loadHtml } from '../cheerio'

const html$ = loadHtml(kitchenSinkRoot)(optionsHtml)

test('scrapes correct asset scripts', () => {
  const result = getJsAssets(html$)

  expect(result).toEqual(['test/mv2-kitchen-sink/asset.js'])
})
