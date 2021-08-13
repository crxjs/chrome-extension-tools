import { readJSON, writeJSON } from 'fs-extra'
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
} from '../../../__fixtures__/mv2-kitchen-sink-paths'
import { context } from '../../../__fixtures__/minimal-plugin-context'
import { getExtPath } from '../../../__fixtures__/utils'
import { ManifestInputPluginCache } from '../../plugin-options'
import { cloneObject } from '../cloneObject'
import { explorer, manifestInput } from '../index'

jest.spyOn(explorer, 'load')

const validate = require('../manifest-parser/validate')
jest.spyOn(validate, 'validateManifest')

const manifestParser = require('../manifest-parser/index')
jest.spyOn(manifestParser, 'deriveFiles')

const manifest = require(manifestJson)

const cache: ManifestInputPluginCache = {
  assets: [],
  contentScripts: [],
  permsHash: '',
  srcDir: null,
  iife: [],
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

const clonedOptions = cloneObject(options)

const crxName = 'mv2-kitchen-sink'
const expectedInputResult = {
  background: getExtPath(crxName, 'background.js'),
  content: getExtPath(crxName, 'content.js'),
  'devtools/devtools': getExtPath(
    crxName,
    'devtools/devtools.html',
  ),
  index: getExtPath(crxName, 'index.html'),
  options: getExtPath(crxName, 'options.html'),
  'popup/popup': getExtPath(crxName, 'popup/popup.html'),
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

test('does not mutate the options object', () => {
  plugin.options.call(context, options)

  expect(options).toEqual(clonedOptions)
})

test('throws if input does not contain a manifest', () => {
  expect(() => {
    plugin.options.call(context, {
      input: ['not-a-manifest'],
    })
  }).toThrow(
    new TypeError(
      'Could not find manifest in Rollup options.input: ["not-a-manifest"]',
    ),
  )

  expect(() => {
    plugin.options.call(context, {
      input: { wrong: 'not-a-manifest' },
    })
  }).toThrow(
    new TypeError(
      'Could not find manifest in Rollup options.input: {"wrong":"not-a-manifest"}',
    ),
  )
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

  expect(result?.input).toEqual(expectedInputResult)
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

  expect(result?.input).toEqual(expectedInputResult)
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
    {
      contentScripts: true,
    },
  )
})

test('caches contentScript filenames', () => {
  plugin.options.call(context, options)

  expect(cache.contentScripts).toEqual(
    expect.arrayContaining([
      getExtPath('mv2-kitchen-sink', 'content.js'),
    ]),
  )
  expect(Object.keys(cache.contentScripts).length).toBe(1)
})

test('validates manifest', async () => {
  plugin.options.call(context, options)

  expect(validate.validateManifest).toBeCalled()
})

test('does nothing if cache.manifest exists', () => {
  cache.manifest = {} as chrome.runtime.Manifest
  cache.srcDir = getExtPath('mv2-kitchen-sink')
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

  expect(call).toThrow(
    /^Could not load manifest: not-a-manifest\.json does not exist/,
  )
})

test('should throw if manifest file is empty', () => {
  const call = () => {
    plugin.options.call(context, {
      input: getExtPath('mv2-empty', 'manifest.json'),
    })
  }

  const error = new Error(
    `${getExtPath(
      'mv2-empty',
      'manifest.json',
    )} is an empty file.`,
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

test('should throw if options_ui and options_page both exist', () => {
  const call = () => {
    plugin.options.call(context, {
      input: getExtPath(
        'mv2-both-option-types-manifest/manifest.json',
      ),
    })
  }

  const error = new Error(
    'options_ui and options_page cannot both be defined in manifest.json.',
  )

  expect(call).toThrow(error)
})

test.todo('populates cache.iife')

describe('MV3', () => {
  test('coerces background.type to module', () => {
    plugin.options.call(context, {
      input: getExtPath('mv3-basic-js', 'src', 'manifest.json'),
    })

    const result = cache.manifest as chrome.runtime.ManifestV3

    expect(result.background!.type).toBe('module')
  })

  test('does not create background property', () => {
    plugin.options.call(context, {
      input: getExtPath(
        'mv3-content-script-only',
        'src',
        'manifest.json',
      ),
    })

    const result = cache.manifest as chrome.runtime.ManifestV3

    expect(result.background).toBeUndefined()
  })
})

describe('MV2', () => {
  test('does not modify background property', () => {
    plugin.options.call(context, options)

    const result = cache.manifest as chrome.runtime.ManifestV2

    expect(result.background).toMatchObject({
      scripts: ['background.js'],
    })
  })

  test('does not create background property', () => {
    plugin.options.call(context, {
      input: getExtPath('mv2-html-only', 'manifest.json'),
    })

    const result = cache.manifest as chrome.runtime.ManifestV2

    expect(result.background).toBeUndefined()
  })
})
