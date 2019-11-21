import { getExtPath } from '../../../__fixtures__/utils'
import { loadHtml, getImgSrcs } from '../cheerio'

const html$ = loadHtml(getExtPath('basic/options.html'))

test('scrapes correct img tags', () => {
  const result = getImgSrcs(html$)

  expect(result).toEqual([
    '__fixtures__/extensions/basic/options.png',
    '__fixtures__/extensions/basic/options.jpg',
  ])
})
