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
    assetChanged: false
  }
  plugin = manifestInput({ cache })
  plugin.options.call(minContext, options)

  jest.clearAllMocks()
})

const fs = require('fs-extra')
jest.spyOn(fs, 'readFile')

test('calls this.addWatchFile for manifest and assets', async () => {
  await plugin.buildStart.call(context, options)

  expect(context.addWatchFile).toBeCalledTimes(6)
  expect(context.addWatchFile).toBeCalledWith(manifestJson)
  expect(context.addWatchFile).toBeCalledWith(optionsJpg)
  expect(context.addWatchFile).toBeCalledWith(icon16)
  expect(context.addWatchFile).toBeCalledWith(icon48)
  expect(context.addWatchFile).toBeCalledWith(icon128)
  expect(context.addWatchFile).toBeCalledWith(contentCss)
})

test('calls readFile for assets', async () => {
  await plugin.buildStart.call(context, options)

  expect(fs.readFile).toBeCalledTimes(5)
  expect(fs.readFile).toBeCalledWith(optionsJpg, 'utf8')
  expect(fs.readFile).toBeCalledWith(icon16, 'utf8')
  expect(fs.readFile).toBeCalledWith(icon48, 'utf8')
  expect(fs.readFile).toBeCalledWith(icon128, 'utf8')
  expect(fs.readFile).toBeCalledWith(contentCss, 'utf8')
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
  expect(fs.readFile).toBeCalledWith(contentCss, 'utf8')
})

test('emits each asset asset once', async () => {
  await plugin.buildStart.call(context, options)

  expect(context.emitFile).toBeCalledTimes(5)
  expect(context.emitFile).toBeCalledWith({
    type: 'asset',
    source: expect.any(String),
    fileName: optionsJpg.replace(srcDir, '').replace(/^\//, ''),
  })
  expect(context.emitFile).toBeCalledWith({
    type: 'asset',
    source: expect.any(String),
    fileName: icon16.replace(srcDir, '').replace(/^\//, ''),
  })
  expect(context.emitFile).toBeCalledWith({
    type: 'asset',
    source: expect.any(String),
    fileName: icon48.replace(srcDir, '').replace(/^\//, ''),
  })
  expect(context.emitFile).toBeCalledWith({
    type: 'asset',
    source: expect.any(String),
    fileName: icon128.replace(srcDir, '').replace(/^\//, ''),
  })
  expect(context.emitFile).toBeCalledWith({
    type: 'asset',
    source: expect.any(String),
    fileName: contentCss.replace(srcDir, '').replace(/^\//, ''),
  })
})
