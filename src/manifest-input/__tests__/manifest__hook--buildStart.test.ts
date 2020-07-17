import { RollupOptions } from 'rollup'
import {
  manifestInput,
  ManifestInputPlugin,
  ManifestInputPluginCache,
} from '..'
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
} from '../../../__fixtures__/basic-paths'
import { context as minContext } from '../../../__fixtures__/minimal-plugin-context'
import { context } from '../../../__fixtures__/plugin-context'

const options: RollupOptions = {
  input: manifestJson,
}

let cache: ManifestInputPluginCache
let plugin: ManifestInputPlugin
beforeEach(() => {
  cache = {
    assets: [],
    permsHash: '',
    srcDir: null,
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

  expect(context.addWatchFile).toBeCalledTimes(9)
  expect(context.addWatchFile).toBeCalledWith(manifestJson)
  expect(context.addWatchFile).toBeCalledWith(optionsJpg)
  expect(context.addWatchFile).toBeCalledWith(icon16)
  expect(context.addWatchFile).toBeCalledWith(icon48)
  expect(context.addWatchFile).toBeCalledWith(icon128)
  expect(context.addWatchFile).toBeCalledWith(contentCss)
  expect(context.addWatchFile).toBeCalledWith(missaaliOtf)
  expect(context.addWatchFile).toBeCalledWith(notoSansBlack)
  expect(context.addWatchFile).toBeCalledWith(notoSansLight)
})

test('calls readFile for assets', async () => {
  await plugin.buildStart.call(context, options)

  expect(fs.readFile).toBeCalledTimes(8)
  expect(fs.readFile).toBeCalledWith(optionsJpg)
  expect(fs.readFile).toBeCalledWith(icon16)
  expect(fs.readFile).toBeCalledWith(icon48)
  expect(fs.readFile).toBeCalledWith(icon128)
  expect(fs.readFile).toBeCalledWith(contentCss)
  expect(fs.readFile).toBeCalledWith(missaaliOtf)
  expect(fs.readFile).toBeCalledWith(notoSansBlack)
  expect(fs.readFile).toBeCalledWith(notoSansLight)
})

test('readFile is memoized', async () => {
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

  expect(context.emitFile).toBeCalledTimes(8)
  expect(context.emitFile).toBeCalledWith({
    type: 'asset',
    source: expect.any(Buffer),
    fileName: optionsJpg.replace(srcDir, '').replace(/^\//, ''),
  })
  expect(context.emitFile).toBeCalledWith({
    type: 'asset',
    source: expect.any(Buffer),
    fileName: icon16.replace(srcDir, '').replace(/^\//, ''),
  })
  expect(context.emitFile).toBeCalledWith({
    type: 'asset',
    source: expect.any(Buffer),
    fileName: icon48.replace(srcDir, '').replace(/^\//, ''),
  })
  expect(context.emitFile).toBeCalledWith({
    type: 'asset',
    source: expect.any(Buffer),
    fileName: icon128.replace(srcDir, '').replace(/^\//, ''),
  })
  expect(context.emitFile).toBeCalledWith({
    type: 'asset',
    source: expect.any(Buffer),
    fileName: contentCss.replace(srcDir, '').replace(/^\//, ''),
  })
  expect(context.emitFile).toBeCalledWith({
    type: 'asset',
    source: expect.any(Buffer),
    fileName: missaaliOtf.replace(srcDir, '').replace(/^\//, ''),
  })
  expect(context.emitFile).toBeCalledWith({
    type: 'asset',
    source: expect.any(Buffer),
    fileName: notoSansLight
      .replace(srcDir, '')
      .replace(/^\//, ''),
  })
  expect(context.emitFile).toBeCalledWith({
    type: 'asset',
    source: expect.any(Buffer),
    fileName: notoSansBlack
      .replace(srcDir, '')
      .replace(/^\//, ''),
  })
})
