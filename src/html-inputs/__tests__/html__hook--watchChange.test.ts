import { join } from 'path'
import { context } from '../../../__fixtures__/plugin-context'
import htmlInputs from '../index'
import {
  assetJs,
  backgroundJs,
  optionsCss,
  optionsHtml,
  optionsJpg,
  optionsJs,
  optionsJsx,
  optionsPng,
  optionsTs,
  optionsTsx,
  popupHtml,
  popupJs,
  faviconPng,
  faviconIco,
} from '../../../__fixtures__/basic-paths'
import { loadHtml } from '../cheerio'
import { HtmlInputsPluginCache } from '../../plugin-options'

const srcDir = join(
  process.cwd(),
  '__fixtures__/extensions/basic',
)
const cache: HtmlInputsPluginCache = {
  css: [],
  html: [],
  html$: [],
  img: [],
  input: [],
  js: [],
  scripts: [],
}

const plugin = htmlInputs({ srcDir }, cache)

beforeEach(() => {
  jest.clearAllMocks()

  cache.js = [
    optionsJs,
    optionsJsx,
    optionsTs,
    optionsTsx,
    popupJs,
  ]
  cache.input = [optionsHtml, popupHtml, backgroundJs]
  cache.html = [optionsHtml, popupHtml]
  cache.html$ = cache.html.map(loadHtml(srcDir))
  cache.css = [optionsCss]
  cache.img = [optionsPng, optionsJpg, faviconPng, faviconIco]
  cache.scripts = [assetJs]
})

test('dumps cache.html$ if id is html file', () => {
  expect(cache.html$.length).toBe(2)

  plugin.watchChange.call(context, 'options.html')

  expect(cache.html$.length).toBe(0)
})

test('dumps cache.html$ if id is manifest file', () => {
  expect(cache.html$.length).toBe(2)

  plugin.watchChange.call(context, 'manifest.json')

  expect(cache.html$.length).toBe(0)
})

test('does nothing if id is not html file', () => {
  expect(cache.html$.length).toBe(2)

  plugin.watchChange.call(context, 'options.js')
  plugin.watchChange.call(context, 'options.css')
  plugin.watchChange.call(context, 'background.ts')

  expect(cache.html$.length).toBe(2)
})
