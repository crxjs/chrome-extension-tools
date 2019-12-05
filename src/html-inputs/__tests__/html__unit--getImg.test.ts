import { optionsHtml } from '../../../__fixtures__/basic-paths'
import { getImgSrcs, loadHtml } from '../cheerio'

const html$ = loadHtml(optionsHtml)

test('scrapes correct img tags and favicons', () => {
  const result = getImgSrcs(html$)

  expect(result).toEqual(
    expect.arrayContaining([
      '__fixtures__/extensions/basic/options.png',
      '__fixtures__/extensions/basic/options.jpg',
      '__fixtures__/extensions/basic/images/favicon.ico',
    ]),
  )
})
