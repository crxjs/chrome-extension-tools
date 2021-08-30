import {
  kitchenSinkRoot,
  optionsHtml,
} from '$test/data/mv2-kitchen-sink-paths'
import {
  updateHtmlElements,
  loadHtml,
  getScripts,
} from '../cheerio'

const html$ = loadHtml(kitchenSinkRoot)(optionsHtml)

test('maps script tags to js and type module', () => {
  expect.assertions(8)

  const mapped = updateHtmlElements({})(html$)

  const results = getScripts(mapped)

  results.forEach(({ attribs: { src, type } }) => {
    expect(src.endsWith('js')).toBe(true)
    expect(type).toBe('module')
  })
})
