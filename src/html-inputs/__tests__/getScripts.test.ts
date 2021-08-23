import {
  kitchenSinkRoot,
  optionsHtml,
} from '../../../test/helpers/mv2-kitchen-sink-paths'
import { getScriptSrc, loadHtml } from '../cheerio'

const html$ = loadHtml(kitchenSinkRoot)(optionsHtml)

test('scrapes correct script tags', () => {
  const result = getScriptSrc(html$)

  expect(result).toEqual([
    'helpers/extensions/mv2-kitchen-sink/options1.js',
    'helpers/extensions/mv2-kitchen-sink/options2.jsx',
    'helpers/extensions/mv2-kitchen-sink/options3.ts',
    'helpers/extensions/mv2-kitchen-sink/options4.tsx',
  ])
})
