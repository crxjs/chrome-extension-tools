import { join } from 'path'
import htmlInputs, { HtmlInputsPluginCache } from '../index'
import { getExtPath } from '../../../__fixtures__/utils'
import { InputOptions, EmittedAsset } from 'rollup'
import { context } from '../../../__fixtures__/plugin-context'
import { readFile } from 'fs-extra'
import {
  optionsHtml,
  popupHtml,
  optionsJs,
  optionsJsx,
  optionsTs,
  optionsTsx,
  popupJs,
  backgroundJs,
  optionsCss,
  optionsPng,
  optionsJpg,
  assetJs,
  faviconIco,
  faviconPng,
} from '../../../__fixtures__/basic-paths'

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

test('modifies html source', async () => {
  const optionsSource = await readFile(
    getExtPath('basic/options-result.html'),
    'utf8',
  )
  const popupSource = await readFile(
    getExtPath('basic/popup-result.html'),
    'utf8',
  )

  await plugin.buildStart.call(context, options)

  const [optionsCall] = context.emitFile.mock.calls.find(
    ([{ fileName }]) => fileName === 'options.html',
  ) as [EmittedAsset]

  const [popupCall] = context.emitFile.mock.calls.find(
    ([{ fileName }]) => fileName === 'popup/popup.html',
  ) as [EmittedAsset]

  expect(optionsCall.source).toBe(optionsSource)
  expect(popupCall.source).toBe(popupSource)
})
