import { RollupOptions } from 'rollup'
import { manifestInput } from '..'
import {
  contentCss,
  icon128,
  icon16,
  icon48,
  manifestJson,
  optionsJpg,
  srcDir,
  missaaliOtf,
  notoSansLight,
  notoSansBlack,
  localesEnJson,
  localesEsJson,
} from '../../../__fixtures__/mv3-kitchen-sink-paths'
import { context as minContext } from '../../../__fixtures__/minimal-plugin-context'
import { context } from '../../../__fixtures__/plugin-context'
import {
  ManifestInputPluginCache,
  ManifestInputPlugin,
} from '../../plugin-options'

const assets = [
  // options image
  optionsJpg,
  // icons
  icon16,
  icon48,
  icon128,
  // content script css
  contentCss,
  // web accessible resources
  missaaliOtf,
  notoSansLight,
  notoSansBlack,
  // locales
  localesEsJson,
  localesEnJson,
]

const options: RollupOptions = {
  input: manifestJson,
}

let cache: ManifestInputPluginCache
let plugin: ManifestInputPlugin
beforeEach(() => {
  cache = {
    assets: [],
    contentScripts: [],

    permsHash: '',
    srcDir: null,
    iife: [],
    input: [],
    readFile: new Map(),
    assetChanged: false,
    inputObj: {},
    inputAry: [],
  }
  plugin = manifestInput({ cache })
  plugin.options.call(minContext, options)

  jest.clearAllMocks()
})

const fs = require('fs-extra')
jest.spyOn(fs, 'readFile')

test('calls this.addWatchFile for manifest and assets', async () => {
  await plugin.buildStart.call(context, options)

  expect(context.addWatchFile).toBeCalledWith(manifestJson)

  assets.forEach((asset) => {
    expect(context.addWatchFile).toBeCalledWith(asset)
  })

  expect(context.addWatchFile).toBeCalledTimes(11)
})

test('calls readFile for assets', async () => {
  await plugin.buildStart.call(context, options)

  assets.forEach((asset) => {
    expect(fs.readFile).toBeCalledWith(asset)
  })

  expect(fs.readFile).toBeCalledTimes(10)
})

test('readFile is memoized so duplicate assets are read once', async () => {
  await plugin.buildStart.call(context, options)
  fs.readFile.mockClear()

  await plugin.buildStart.call(context, options)

  expect(fs.readFile).toBeCalledTimes(0)
})

test('readFile only re-runs for changed files', async () => {
  await plugin.buildStart.call(context, options)
  fs.readFile.mockClear()

  cache.readFile.delete(contentCss)
  await plugin.buildStart.call(context, options)

  expect(fs.readFile).toBeCalledTimes(1)
  expect(fs.readFile).toBeCalledWith(contentCss)
})

test('emits each asset asset once', async () => {
  await plugin.buildStart.call(context, options)

  // Emits the manifest as a string
  expect(context.emitFile).toBeCalledWith({
    type: 'asset',
    source: expect.any(String),
    fileName: manifestJson
      .replace(srcDir, '')
      .replace(/^\//, ''),
  })

  // Directly copies all other assets
  assets.forEach((asset) => {
    expect(context.emitFile).toBeCalledWith({
      type: 'asset',
      source: expect.any(Buffer),
      fileName: asset.replace(srcDir, '').replace(/^\//, ''),
    })
  })

  expect(context.emitFile).toBeCalledTimes(11)
})

test.todo('emits dynamic import wrappers for content scripts')
test.todo('adds chunks to web_accessible_resources')
test.todo('emits correct paths on Windows')
