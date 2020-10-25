import {
  basicRoot,
  optionsHtml,
} from '../../../__fixtures__/basic-paths'
import {
  mutateScriptElems,
  loadHtml,
  getScripts,
} from '../cheerio'

const html$ = loadHtml(basicRoot)(optionsHtml)

test('maps script tags to js and type module', () => {
  expect.assertions(8)

  const mapped = mutateScriptElems({})(html$)

  const results = getScripts(mapped)

  results.forEach(({ attribs: { src, type } }) => {
    expect(src.endsWith('js')).toBe(true)
    expect(type).toBe('module')
  })
})
