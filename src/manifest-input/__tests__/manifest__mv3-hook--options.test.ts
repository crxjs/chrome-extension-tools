import { context } from '../../../__fixtures__/minimal-plugin-context'
import { getExtPath } from '../../../__fixtures__/utils'
import { ManifestInputPluginCache } from '../../plugin-options'
import { manifestInput } from '../index'

const cache: ManifestInputPluginCache = {
  assets: [],
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
