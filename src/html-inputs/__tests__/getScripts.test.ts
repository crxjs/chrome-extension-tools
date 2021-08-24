import {
  kitchenSinkRoot,
  optionsHtml,
} from '$test/data/mv2-kitchen-sink-paths'
import { getScriptSrc, loadHtml } from '../cheerio'

const html$ = loadHtml(kitchenSinkRoot)(optionsHtml)

test('scrapes correct script tags', () => {
  const result = getScriptSrc(html$)

  expect(result).toEqual([
    'test/mv2-kitchen-sink/options1.js',
    'test/mv2-kitchen-sink/options2.jsx',
    'test/mv2-kitchen-sink/options3.ts',
    'test/mv2-kitchen-sink/options4.tsx',
  ])
})
