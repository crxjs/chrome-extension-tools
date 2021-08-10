import { RollupOptions } from 'rollup'
import { context } from '../../../__fixtures__/minimal-plugin-context'
import { manifestJson } from '../../../__fixtures__/mv2-kitchen-sink-paths'
import { getExtPath } from '../../../__fixtures__/utils'
import { ManifestInputPluginCache } from '../../plugin-options'
import { manifestInput } from '../index'

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

beforeEach(jest.clearAllMocks)

beforeEach(() => {
  cache.assets = []
  cache.permsHash = ''
  cache.input = []
  cache.srcDir = null
  cache.inputAry = []
  cache.inputObj = {}
  delete cache.manifest
})

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
