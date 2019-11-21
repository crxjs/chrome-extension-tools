import { getExtPath } from '../../../__fixtures__/utils'
import { loadHtml, getCssHrefs } from '../cheerio'

const html$ = loadHtml(getExtPath('basic/options.html'))

test('scrapes correct stylesheets', () => {
  const result = getCssHrefs(html$)

  expect(result).toEqual([
    '__fixtures__/extensions/basic/options.css',
  ])
})
