import { join } from 'path'
import { InputOptions } from 'rollup'
import {
  assetJs,
  backgroundJs,
  kitchenSinkRoot,
  faviconIco,
  faviconPng,
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
} from '../../../__fixtures__/mv2-kitchen-sink-paths'
import { context } from '../../../__fixtures__/plugin-context'
import { loadHtml } from '../cheerio'
import htmlInputs from '..'
import { HtmlInputsPluginCache } from '../../plugin-options'

const srcDir = join(
  process.cwd(),
  '__fixtures__/extensions/mv2-kitchen-sink',
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

let options: InputOptions
beforeEach(() => {
  jest.clearAllMocks()

  options = {
    input: [optionsHtml, popupHtml],
  } as InputOptions

  cache.js = [
    optionsJs,
    optionsJsx,
    optionsTs,
    optionsTsx,
    popupJs,
  ]
  cache.input = [optionsHtml, popupHtml, backgroundJs]
  cache.html = [optionsHtml, popupHtml]
  cache.html$ = cache.html.map(loadHtml(kitchenSinkRoot))
  cache.css = [optionsCss]
  cache.img = [optionsPng, optionsJpg, faviconIco, faviconPng]
  cache.scripts = [assetJs]
})

test('emits all assets', async () => {
  await plugin.buildStart.call(context, options)

  expect(context.emitFile).toBeCalledTimes(8)

  expect(context.emitFile).toBeCalledWith({
    type: 'asset',
    source: expect.any(String),
    fileName: 'options.html',
  })
  expect(context.emitFile).toBeCalledWith({
    type: 'asset',
    source: expect.any(String),
    fileName: 'popup/popup.html',
  })
  expect(context.emitFile).toBeCalledWith({
    type: 'asset',
    source: expect.any(Buffer),
    fileName: 'images/favicon.png',
  })
  expect(context.emitFile).toBeCalledWith({
    type: 'asset',
    source: expect.any(Buffer),
    fileName: 'options.css',
  })
  expect(context.emitFile).toBeCalledWith({
    type: 'asset',
    source: expect.any(Buffer),
    fileName: 'options.png',
  })
  expect(context.emitFile).toBeCalledWith({
    type: 'asset',
    source: expect.any(Buffer),
    fileName: 'options.jpg',
  })
  expect(context.emitFile).toBeCalledWith({
    type: 'asset',
    source: expect.any(Buffer),
    fileName: 'images/favicon.ico',
  })
  expect(context.emitFile).toBeCalledWith({
    type: 'asset',
    source: expect.any(Buffer),
    fileName: 'asset.js',
  })
})

test('calls this.addWatchFile for each asset', async () => {
  await plugin.buildStart.call(context, options)

  expect(context.addWatchFile).toBeCalledTimes(8)
})
