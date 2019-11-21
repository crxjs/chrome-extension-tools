import { join } from 'path'
import htmlInputs, { HtmlInputsPluginCache } from '../index'
import { getExtPath } from '../../../__fixtures__/utils'
import { InputOptions, EmittedAsset } from 'rollup'
import { context } from '../../../__fixtures__/plugin-context'
import { readFile } from 'fs-extra'

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
  cache.img = [optionsPng, optionsJpg]
  cache.scripts = [assetJs]
})

test('emits all assets', async () => {
  await plugin.buildStart.call(context, options)

  expect(context.emitFile).toBeCalledTimes(6)

  expect(context.emitFile).toBeCalledWith({
    type: 'asset',
    source: expect.any(String),
    fileName: 'options.html',
  })
  expect(context.emitFile).toBeCalledWith({
    type: 'asset',
    source: expect.any(String),
    fileName: 'popup.html',
  })
  expect(context.emitFile).toBeCalledWith({
    type: 'asset',
    source: expect.any(String),
    fileName: 'options.css',
  })
  expect(context.emitFile).toBeCalledWith({
    type: 'asset',
    source: expect.any(String),
    fileName: 'options.png',
  })
  expect(context.emitFile).toBeCalledWith({
    type: 'asset',
    source: expect.any(String),
    fileName: 'options.jpg',
  })
  expect(context.emitFile).toBeCalledWith({
    type: 'asset',
    source: expect.any(String),
    fileName: 'asset.js',
  })
})

test('calls this.addWatchFile for each asset', async () => {
  await plugin.buildStart.call(context, options)

  expect(context.addWatchFile).toBeCalledTimes(6)
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
    ([{ fileName }]) => fileName === 'popup.html',
  ) as [EmittedAsset]

  expect(optionsCall.source).toBe(optionsSource)
  expect(popupCall.source).toBe(popupSource)
})
