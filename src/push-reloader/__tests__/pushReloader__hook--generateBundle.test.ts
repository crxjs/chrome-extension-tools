import {
  InputOptions,
  OutputBundle,
  EmittedFile,
  OutputAsset,
} from 'rollup'

import {
  pushReloader,
  loadMessage,
  PushReloaderCache,
  PushReloaderPlugin,
} from '..'
import { context } from '../../../__fixtures__/plugin-context'
import { cloneObject } from '../../manifest-input/cloneObject'

import * as functions from '../fb-functions'
import { ChromeExtensionManifest } from '../../manifest'

jest.mock('../fb-functions.ts', () => ({
  login: jest.fn(() => Promise.resolve('UID')),
  update: jest.fn(() => Promise.resolve()),
  reload: jest.fn(() => Promise.resolve()),
}))

jest.useFakeTimers()

// Options is not used, but needed for TS
const options: InputOptions = {}
const originalBundle: OutputBundle = require('../../../__fixtures__/extensions/basic-bundle.json')

const contentJs = expect.stringMatching(/assets\/content.+?\.js/)

let plugin: PushReloaderPlugin
let bundle: OutputBundle
let cache: PushReloaderCache
let manifestObj: OutputAsset
let manifestClone: OutputAsset
let manifest: ChromeExtensionManifest
beforeEach(async () => {
  jest.clearAllMocks()
  context.getFileName.mockImplementation(() => 'mock-file-name')

  bundle = cloneObject(originalBundle)
  cache = { firstRun: true }
  plugin = pushReloader({ cache })

  manifestObj = bundle['manifest.json'] as OutputAsset
  manifestClone = cloneObject(manifestObj)

  await plugin.generateBundle.call(
    context,
    options,
    bundle,
    false,
  )

  manifest = JSON.parse(manifestObj.source as string)
})

afterEach(() => {
  if (cache.interval) {
    clearInterval(cache.interval)
  }
})

test('calls login cloud function on first run', () => {
  expect(functions.login).toBeCalled()
  expect(cache.uid).toBe('UID')
  expect(cache.firstRun).toBe(false)
})

test('does not call login cloud function on later runs', async () => {
  jest.clearAllMocks()

  // Second call to generateBundle
  expect(cache.firstRun).toBe(false)
  await plugin.generateBundle.call(
    context,
    options,
    bundle,
    false,
  )

  expect(functions.login).not.toBeCalled()
  expect(cache.uid).toBe('UID')
  expect(cache.firstRun).toBe(false)
})

test('calls update cloud function on first run', () => {
  expect(functions.update).toBeCalled()
  expect(cache.interval).toBeDefined()
})

test('starts update interval on first run', () => {
  jest.clearAllMocks()
  jest.advanceTimersByTime(6 * 60 * 1000)

  expect(functions.update).toBeCalled()
})

test('does not call update cloud function on later runs', () => {
  jest.clearAllMocks()

  expect(functions.update).not.toBeCalled()
  expect(cache.interval).toBeDefined()
})

test('does not start another update interval on later runs', async () => {
  clearInterval(cache.interval!)
  jest.clearAllMocks()

  // Second call to generateBundle
  await plugin.generateBundle.call(
    context,
    options,
    bundle,
    false,
  )

  expect(functions.update).not.toBeCalled()

  jest.advanceTimersByTime(6 * 60 * 1000)

  expect(functions.update).not.toBeCalled()
})

test('emits assets', async () => {
  expect(context.emitFile).toBeCalledTimes(4)

  expect(context.emitFile).toBeCalledWith<[EmittedFile]>({
    type: 'asset',
    name: 'reloader-sw.js',
    source: expect.any(String),
  })
  expect(context.emitFile).toBeCalledWith<[EmittedFile]>({
    type: 'asset',
    name: 'bg-reloader-client.js',
    source: expect.any(String),
  })
  expect(context.emitFile).toBeCalledWith<[EmittedFile]>({
    type: 'asset',
    name: 'bg-reloader-wrapper.js',
    source: expect.any(String),
  })
  expect(context.emitFile).toBeCalledWith<[EmittedFile]>({
    type: 'asset',
    name: 'ct-reloader-client.js',
    source: expect.any(String),
  })
})

test('updates manifest in bundle', async () => {
  expect(manifestObj).toBe(bundle['manifest.json'])
  expect(manifestObj).not.toEqual(manifestClone)

  expect(manifestObj).toEqual<OutputAsset>({
    fileName: 'manifest.json',
    type: 'asset',
    source: expect.any(String),
    isAsset: true,
  })

  expect(manifest).toMatchObject<ChromeExtensionManifest>({
    manifest_version: 2,
    name: expect.any(String),
    version: expect.any(String),
    description: expect.any(String),
  })
})

test('set manifest description', async () => {
  expect(manifest.description).toBe(loadMessage)
})

test('adds permissions', async () => {
  expect(manifest.permissions).toContain('notifications')
  expect(manifest.permissions).toContain(
    'https://us-central1-rpce-reloader.cloudfunctions.net/registerToken',
  )
})

test('add reloader script to background', async () => {
  expect(manifest.background!.scripts).toContain(
    'mock-file-name',
  )
})

test('add reloader script to content scripts', async () => {
  expect(manifest.content_scripts!.length).toBe(2)
  expect(manifest.content_scripts!).toContainEqual({
    js: ['mock-file-name', contentJs],
    matches: ['https://www.google.com/*'],
  })
  expect(manifest.content_scripts!).toContainEqual({
    js: ['mock-file-name', contentJs],
    css: ['content.css'],
    matches: ['https://www.yahoo.com/*'],
  })
})
