import {
  kitchenSinkRoot,
  optionsHtml,
} from '../../../__fixtures__/mv2-kitchen-sink-paths'
import { getImgSrcs, loadHtml } from '../cheerio'

const html$ = loadHtml(kitchenSinkRoot)(optionsHtml)

test('scrapes correct img tags and favicons', () => {
  const result = getImgSrcs(html$)

  expect(result).toEqual(
    expect.arrayContaining([
      '__fixtures__/extensions/mv2-kitchen-sink/options.png',
      '__fixtures__/extensions/mv2-kitchen-sink/options.jpg',
      '__fixtures__/extensions/mv2-kitchen-sink/images/favicon.png',
    ]),
  )
})
