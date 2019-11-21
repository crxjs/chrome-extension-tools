import { join } from 'path'
import { context } from '../../../__fixtures__/plugin-context'
import { getExtPath } from '../../../__fixtures__/utils'
import htmlInputs, { HtmlInputsPluginCache } from '../index'

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

// Html files
const optionsHtml = getExtPath('basic/options.html')
const popupHtml = getExtPath('basic/popup.html')

// Html scripts
const optionsJs = getExtPath('basic/options1.js')
const optionsJsx = getExtPath('basic/options2.jsx')
const optionsTs = getExtPath('basic/options3.ts')
const optionsTsx = getExtPath('basic/options4.tsx')
const popupJs = getExtPath('basic/popup.js')

// Html assets
const optionsCss = getExtPath('basic/options.css')
const optionsPng = getExtPath('basic/options.png')
const optionsJpg = getExtPath('basic/options.jpg')
const assetJs = getExtPath('basic/asset.js')

// External script file
const backgroundJs = getExtPath('basic/background.js')

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
