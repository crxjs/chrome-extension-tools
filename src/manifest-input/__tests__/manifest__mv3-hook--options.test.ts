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

describe('MV3 background service worker', () => {
  test('coerces background type to module', () => {
    plugin.options.call(context, {
      input: getExtPath('mv3-basic-js', 'src', 'manifest.json'),
    })

    const result = cache.manifest as chrome.runtime.ManifestV3

    expect(result.background!.type).toBe('module')
  })

  test('does not create one if none', () => {
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

describe('content scripts and web_accessible_resource (WAR)', () => {
  test('gets match patterns from manifest', () => {
    plugin.options.call(context, {
      input: getExtPath('mv3-basic-js', 'src', 'manifest.json'),
    })

    const {
      content_scripts: [script1] = [
        { matches: ['script is undefined'] },
      ],
      host_permissions = ['host permissions is undefined'],
      web_accessible_resources: [war1] = [
        { matches: ['war is undefined'] },
      ],
    } = cache.manifest as chrome.runtime.ManifestV3

    expect(war1.matches).toEqual(
      expect.arrayContaining(script1.matches!),
    )
    expect(war1.matches).toEqual(
      expect.arrayContaining(host_permissions),
    )
  })

  test.todo('creates minmatch pattern from chunkFileNames')

  test.todo('sets default if no chunkFileNames value')

  test.todo('adds imported modules to WAR')

  test.todo('does not modify WAR if no content scripts')
})

describe('multiple Rollup OutputOptions', () => {
  test.todo('throws with multiple chunkFileNames values')
  test.todo('allows same chunkFileNames value')
  test.todo('sets default if no chunkFileNames value')
})
