import { InputOptions, OutputOptions } from 'rollup'
import { context } from '../../../__fixtures__/minimal-plugin-context'
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

describe('background service worker', () => {
  test('coerces background type to module', () => {
    plugin.options.call(context, {
      input: getExtPath('mv3-basic-js', 'src', 'manifest.json'),
    })

    const result = cache.manifest as chrome.runtime.ManifestV3

    expect(result.background!.type).toBe('module')
  })

  test('does not create background if none', () => {
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

  test('creates minmatch pattern from chunkFileNames', () => {
    const { default: options } = require(getExtPath(
      'mv3-basic-js',
      'rollup.config.js',
    )) as { default: InputOptions & { output: OutputOptions } }

    options.output.chunkFileNames =
      'chunks-[format]/[name]-[hash].js'

    plugin.options.call(context, options)

    const {
      web_accessible_resources: [war1] = [
        { resources: ['war is undefined'] },
      ],
    } = cache.manifest as chrome.runtime.ManifestV3

    expect(war1.resources).toEqual([
      'chunks-*/*-*.js',
      'content.js',
    ])
  })

  test('sets default if no chunkFileNames value', () => {
    const { default: options } = require(getExtPath(
      'mv3-basic-js',
      'rollup.config.js',
    )) as { default: InputOptions & { output: OutputOptions } }

    delete options.output.chunkFileNames

    plugin.options.call(context, options)

    const {
      web_accessible_resources: [war1] = [
        { resources: ['war is undefined'] },
      ],
    } = cache.manifest as chrome.runtime.ManifestV3

    expect(war1.resources).toEqual([
      'chunks/*-*.js',
      'content.js',
    ])
  })

  test('does not modify WAR if no content scripts', () => {
    const { default: options } = require(getExtPath(
      'mv3-background-only',
      'rollup.config.js',
    )) as { default: InputOptions & { output: OutputOptions } }

    plugin.options.call(context, options)

    expect(
      cache.manifest!.web_accessible_resources,
    ).toBeUndefined()
  })
})

describe('multiple Rollup OutputOptions', () => {
  test('throws with multiple chunkFileNames values', () => {
    const { default: options } = require(getExtPath(
      'mv3-basic-js',
      'rollup.config.js',
    )) as { default: InputOptions & { output: OutputOptions } }

    expect(() =>
      plugin.options.call(context, {
        ...options,
        output: ['[name].js', '[hash].js'].map(
          (chunkFileNames) => ({
            ...options.output,
            chunkFileNames,
          }),
        ),
      }),
    ).toThrowError(
      new TypeError(
        'Multiple output values for chunkFileNames are not supported',
      ),
    )
  })

  test('allows same chunkFileNames value', () => {
    const { default: options } = require(getExtPath(
      'mv3-basic-js',
      'rollup.config.js',
    )) as { default: InputOptions & { output: OutputOptions } }

    options.output.chunkFileNames =
      'chunks-[format]/[name]-[hash].js'

    plugin.options.call(context, {
      ...options,
      output: [options.output, options.output],
    })

    const {
      web_accessible_resources: [war1] = [
        { resources: ['war is undefined'] },
      ],
    } = cache.manifest as chrome.runtime.ManifestV3

    expect(war1.resources).toEqual([
      'chunks-*/*-*.js',
      'content.js',
    ])
  })

  test('sets default if no chunkFileNames value', () => {
    const { default: options } = require(getExtPath(
      'mv3-basic-js',
      'rollup.config.js',
    )) as { default: InputOptions & { output: OutputOptions } }

    delete options.output.chunkFileNames

    const result = plugin.options.call(context, {
      ...options,
      output: [options.output, options.output],
    }) as InputOptions & { output: OutputOptions[] }

    result.output.forEach((output) => {
      expect(output.chunkFileNames).toBe(
        'chunks/[name]-[hash].js',
      )
    })

    const {
      web_accessible_resources: [war1] = [
        { resources: ['war is undefined'] },
      ],
    } = cache.manifest as chrome.runtime.ManifestV3

    expect(war1.resources).toEqual([
      'chunks/*-*.js',
      'content.js',
    ])
  })
})
