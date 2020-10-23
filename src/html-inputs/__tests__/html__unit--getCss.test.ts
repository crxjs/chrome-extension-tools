import { loadHtml, getCssHrefs } from '../cheerio'
import { basicRoot, optionsHtml } from '../../../__fixtures__/basic-paths'

const html$ = loadHtml(basicRoot)(optionsHtml)

test('scrapes correct stylesheets', () => {
  const result = getCssHrefs(html$)

  expect(result).toEqual([
    '__fixtures__/extensions/basic/options.css',
  ])
})
