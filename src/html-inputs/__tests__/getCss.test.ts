import { loadHtml, getCssHrefs } from '../cheerio'
import {
  kitchenSinkRoot,
  optionsHtml,
} from '../../../test/helpers/mv2-kitchen-sink-paths'

const html$ = loadHtml(kitchenSinkRoot)(optionsHtml)

test('scrapes correct stylesheets', () => {
  const result = getCssHrefs(html$)

  expect(result).toEqual([
    'helpers/extensions/mv2-kitchen-sink/options.css',
  ])
})
