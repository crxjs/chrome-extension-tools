import { join } from 'path'
import { context } from '../../../__fixtures__/plugin-context'
import htmlInputs, { HtmlInputsPluginCache } from '../index'
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
} from '../../../__fixtures__/paths'

const srcDir = join(
  process.cwd(),
  '__fixtures__/extensions/basic',
)
const cache: HtmlInputsPluginCache = {
  css: [],
  html: [],
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
  cache.css = [optionsCss]
  cache.img = [optionsPng, optionsJpg]
  cache.scripts = [assetJs]
})

test('dumps cache.input if id is html file', () => {
  expect(cache.input.length).toBe(3)

  plugin.watchChange.call(context, 'options.html')

  expect(cache.input.length).toBe(0)
})

test('does nothing if id is not html file', () => {
  expect(cache.input.length).toBe(3)

  plugin.watchChange.call(context, 'options.js')
  plugin.watchChange.call(context, 'options.css')
  plugin.watchChange.call(context, 'manifest.json')
  plugin.watchChange.call(context, 'background.ts')

  expect(cache.input.length).toBe(3)
})
