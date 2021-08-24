import { loadHtml, getCssHrefs } from '../cheerio'
import {
  kitchenSinkRoot,
  optionsHtml,
} from '../../../__fixtures__/mv2-kitchen-sink-paths'

const html$ = loadHtml(kitchenSinkRoot)(optionsHtml)

test('scrapes correct stylesheets', () => {
  const result = getCssHrefs(html$)

  expect(result).toEqual([
    '__fixtures__/extensions/mv2-kitchen-sink/options.css',
  ])
})
