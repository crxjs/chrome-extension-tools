import { writeJSON, readJSON } from 'fs-extra'
import { RollupOptions } from 'rollup'
import {
  backgroundJs,
  contentCss,
  contentJs,
  devtoolsHtml,
  icon128,
  icon16,
  icon48,
  indexHtml,
  manifestJson,
  missaaliOtf,
  notoSansBlack,
  notoSansLight,
  optionsHtml,
  optionsJpg,
  popupHtml,
  srcDir,
} from '../../../__fixtures__/basic-paths'
import { context } from '../../../__fixtures__/minimal-plugin-context'
import { getExtPath } from '../../../__fixtures__/utils'
import { ChromeExtensionManifest } from '../../manifest'
import {
  explorer,
  manifestInput,
  ManifestInputPluginCache,
} from '../index'

jest.spyOn(explorer, 'load')

const manifestParser = require('../manifest-parser/index')
jest.spyOn(manifestParser, 'deriveFiles')

const manifest = require(manifestJson)

const cache: ManifestInputPluginCache = {
  assets: [],
  permsHash: '',
  srcDir: null,
  input: [],
  readFile: new Map(),
  assetChanged: false,
  inputAry: [],
  inputObj: {},
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
  cache.inputAry = []
  cache.inputObj = {}
  delete cache.manifest
})

beforeAll(async () => {
  // Reset manifest in case of test crash
  manifest.version = '1.0.0'
  await writeJSON(manifestJson, manifest)
})

afterAll(async () => {
  await writeJSON(manifestJson, manifest, { spaces: 2 })
})

test('throws if input does not contain a manifest', () => {
  const errorMessage =
    'RollupOptions.input must be a single Chrome extension manifest.'

  expect(() => {
    plugin.options.call(context, {
      input: ['not-a-manifest'],
    })
  }).toThrow(new TypeError(errorMessage))

  expect(() => {
    plugin.options.call(context, {
      input: { wrong: 'not-a-manifest' },
    })
  }).toThrow(new TypeError(errorMessage))
})

test('handles input array', () => {
  const options: RollupOptions = {
    input: [manifestJson, indexHtml],
  }

  const result = plugin.options.call(context, options)

  expect(explorer.load).toBeCalledWith(manifestJson)
  expect(explorer.load).toReturnWith({
    config: cache.manifest,
    filepath: manifestJson,
  })

  expect(result?.input).toEqual({
    background:
      '/media/jack/Storage/Documents/ExtendChrome/rollup-plugin-chrome-extension/__fixtures__/extensions/basic/background.js',
    content:
      '/media/jack/Storage/Documents/ExtendChrome/rollup-plugin-chrome-extension/__fixtures__/extensions/basic/content.js',
    'devtools/devtools':
      '/media/jack/Storage/Documents/ExtendChrome/rollup-plugin-chrome-extension/__fixtures__/extensions/basic/devtools/devtools.html',
    index:
      '/media/jack/Storage/Documents/ExtendChrome/rollup-plugin-chrome-extension/__fixtures__/extensions/basic/index.html',
    options:
      '/media/jack/Storage/Documents/ExtendChrome/rollup-plugin-chrome-extension/__fixtures__/extensions/basic/options.html',
    'popup/popup':
      '/media/jack/Storage/Documents/ExtendChrome/rollup-plugin-chrome-extension/__fixtures__/extensions/basic/popup/popup.html',
  })
})

test('handles input object', () => {
  const options: RollupOptions = {
    input: {
      manifest: manifestJson,
      index: indexHtml,
    },
  }

  const result = plugin.options.call(context, options)

  expect(explorer.load).toBeCalledWith(manifestJson)
  expect(explorer.load).toReturnWith({
    config: cache.manifest,
    filepath: manifestJson,
  })

  expect(result?.input).toEqual({
    background:
      '/media/jack/Storage/Documents/ExtendChrome/rollup-plugin-chrome-extension/__fixtures__/extensions/basic/background.js',
    content:
      '/media/jack/Storage/Documents/ExtendChrome/rollup-plugin-chrome-extension/__fixtures__/extensions/basic/content.js',
    'devtools/devtools':
      '/media/jack/Storage/Documents/ExtendChrome/rollup-plugin-chrome-extension/__fixtures__/extensions/basic/devtools/devtools.html',
    index:
      '/media/jack/Storage/Documents/ExtendChrome/rollup-plugin-chrome-extension/__fixtures__/extensions/basic/index.html',
    options:
      '/media/jack/Storage/Documents/ExtendChrome/rollup-plugin-chrome-extension/__fixtures__/extensions/basic/options.html',
    'popup/popup':
      '/media/jack/Storage/Documents/ExtendChrome/rollup-plugin-chrome-extension/__fixtures__/extensions/basic/popup/popup.html',
  })
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
    expect.arrayContaining([
      contentCss,
      icon16,
      optionsJpg,
      icon48,
      icon128,
      missaaliOtf,
      notoSansBlack,
      notoSansLight,
    ]),
  )
  expect(cache.input).toEqual(
    expect.arrayContaining([
      backgroundJs,
      contentJs,
      optionsHtml,
      popupHtml,
      devtoolsHtml,
    ]),
  )
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
  // bypass no scripts error
  cache.input = ['x']

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
    'devtools/devtools': devtoolsHtml,
  })
})

test('should throw if cosmiconfig cannot load manifest file', () => {
  const call = () => {
    plugin.options.call(context, {
      input: 'not-a-manifest.json',
    })
  }

  expect(call).toThrow(/^ENOENT: no such file or directory/)
})

test('should throw if manifest file is empty', () => {
  const call = () => {
    plugin.options.call(context, {
      input: getExtPath('empty/manifest.json'),
    })
  }

  const error = new Error(
    `${getExtPath('empty/manifest.json')} is an empty file.`,
  )

  expect(call).toThrow(error)
})

test('on second run and not cache.manifest, loads manifest from file system', async () => {
  const newManifest = {
    ...manifest,
    version: '2.0.0',
  }

  plugin.options.call(context, options)

  await writeJSON(manifestJson, newManifest)
  delete cache.manifest
  jest.clearAllMocks()

  plugin.options.call(context, options)

  expect(cache.manifest).not.toEqual(manifest)
  expect(cache.manifest).toEqual(await readJSON(manifestJson))
})
