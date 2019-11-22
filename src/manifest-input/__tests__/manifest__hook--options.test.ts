import { RollupOptions } from 'rollup'
import {
  backgroundJs,
  contentJs,
  optionsHtml,
  popupHtml,
  manifestJson,
  srcDir,
  contentCss,
  icon16,
  icon48,
  icon128,
  optionsJpg,
} from '../../../__fixtures__/basic-paths'
import { context } from '../../../__fixtures__/minimal-plugin-context'
import { getExtPath } from '../../../__fixtures__/utils'
import {
  explorer,
  manifestInput,
  ManifestInputPluginCache,
} from '../index'
import { ChromeExtensionManifest } from '../manifest'

jest.spyOn(explorer, 'load')

const manifestParser = require('../manifest-parser/index')
jest.spyOn(manifestParser, 'deriveFiles')

const manifest = require(manifestJson)

const cache: ManifestInputPluginCache = {
  assets: [],
  permsHash: '',
  srcDir: null,
  input: [],
}

const plugin = manifestInput({ cache })

// Rollup config
const options: RollupOptions = {
  input: manifestJson,
}

beforeEach(() => {
  jest.clearAllMocks()

  cache.assets = []
  cache.permsHash = ''
  cache.input = []
  cache.srcDir = null
  delete cache.manifest
})

test('throws if input is not a manifest path', () => {
  expect(() => {
    plugin.options.call(context, {
      input: ['not-a-manifest'],
    })
  }).toThrow()

  expect(() => {
    plugin.options.call(context, {
      input: { wrong: 'not-a-manifest' },
    })
  }).toThrow()
})

test('loads manifest via cosmicConfig', () => {
  plugin.options.call(context, options)

  expect(explorer.load).toBeCalledWith(options.input)
  expect(explorer.load).toReturnWith({
    config: cache.manifest,
    filepath: options.input,
  })
})

test('sets correct cache values', () => {
  plugin.options.call(context, options)

  expect(cache.assets).toEqual(
    [
      contentCss,
      icon16,
      optionsJpg,
      icon48,
      icon128,
    ].map((srcPath) => ({ srcPath })),
  )
  expect(cache.input).toEqual([
    backgroundJs,
    contentJs,
    optionsHtml,
    popupHtml,
  ])
  expect(cache.manifest).toEqual(manifest)
  expect(cache.srcDir).toBe(srcDir)
})

test('calls deriveFiles', () => {
  plugin.options.call(context, options)

  expect(manifestParser.deriveFiles).toBeCalledTimes(1)
  expect(manifestParser.deriveFiles).toBeCalledWith(
    cache.manifest,
    cache.srcDir,
  )
})

test('does nothing if cache.manifest exists', () => {
  cache.manifest = {} as ChromeExtensionManifest
  cache.srcDir = getExtPath('basic')

  plugin.options.call(context, options)

  expect(explorer.load).not.toBeCalled()
  expect(manifestParser.deriveFiles).not.toBeCalled()
})

test('returns inputRecord', () => {
  const result = plugin.options.call(context, options)

  expect(result).toBeInstanceOf(Object)
  expect(result!.input).toEqual<Record<string, string>>({
    background: backgroundJs,
    content: contentJs,
    options: optionsHtml,
    'popup/popup': popupHtml,
  })
})
