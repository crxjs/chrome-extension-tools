import { optionsHtml } from '../../../__fixtures__/basic-paths'
import { getImgSrcs, loadHtml } from '../cheerio'

const html$ = loadHtml(optionsHtml)

test('scrapes correct img tags', () => {
  const result = getImgSrcs(html$)

  expect(result).toEqual([
    '__fixtures__/extensions/basic/options.png',
    '__fixtures__/extensions/basic/options.jpg',
  ])
})
