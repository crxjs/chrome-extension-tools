import {
  InputOptions,
  OutputBundle,
  EmittedFile,
  OutputAsset,
} from 'rollup'

import { simpleReloader, loadMessage } from '..'
import { context } from '../../../__fixtures__/plugin-context'
import { cloneObject } from '../../manifest-input/cloneObject'
import { ChromeExtensionManifest } from '../../manifest'

context.getFileName.mockImplementation(() => 'mock-file-name')

// Options is not used, but needed for TS
const options: InputOptions = {}
const originalBundle: OutputBundle = require('../../../__fixtures__/extensions/basic-bundle.json')

const contentJs = expect.stringMatching(/assets\/content.+?\.js/)

test('emit assets', async () => {
  const bundle = cloneObject(originalBundle)
  const plugin = simpleReloader()

  await plugin.generateBundle.call(
    context,
    options,
    bundle,
    false,
  )

  expect(context.emitFile).toBeCalledTimes(3)
  expect(context.emitFile).toBeCalledWith<[EmittedFile]>({
    type: 'asset',
    fileName: 'assets/timestamp.js',
    source: expect.any(String),
  })
  expect(context.emitFile).toBeCalledWith<[EmittedFile]>({
    type: 'asset',
    name: 'bg-reloader-client.js',
    source: expect.any(String),
  })
  expect(context.emitFile).toBeCalledWith<[EmittedFile]>({
    type: 'asset',
    name: 'ct-reloader-client.js',
    source: expect.any(String),
  })
})

test('updates manifest in bundle', async () => {
  const bundle = cloneObject(originalBundle)
  const plugin = simpleReloader()

  const manifestObj = bundle['manifest.json'] as OutputAsset
  const manifestClone = cloneObject(manifestObj)

  expect(manifestObj).toEqual(manifestClone)

  await plugin.generateBundle.call(
    context,
    options,
    bundle,
    false,
  )

  expect(manifestObj).toBe(bundle['manifest.json'])
  expect(manifestObj).not.toEqual(manifestClone)

  expect(manifestObj).toEqual<OutputAsset>({
    fileName: 'manifest.json',
    type: 'asset',
    source: expect.any(String),
    isAsset: true,
  })

  const manifest: ChromeExtensionManifest = JSON.parse(
    manifestObj.source as string,
  )

  expect(manifest).toMatchObject<ChromeExtensionManifest>({
    manifest_version: 2,
    name: expect.any(String),
    version: expect.any(String),
    description: expect.any(String),
  })
})

test('set manifest description', async () => {
  const bundle = cloneObject(originalBundle)
  const plugin = simpleReloader()

  const manifestObj = bundle['manifest.json'] as OutputAsset

  await plugin.generateBundle.call(
    context,
    options,
    bundle,
    false,
  )

  const manifest: ChromeExtensionManifest = JSON.parse(
    manifestObj.source as string,
  )

  expect(manifest.description).toBe(loadMessage)
})

test('add reloader script to background', async () => {
  const bundle = cloneObject(originalBundle)
  const plugin = simpleReloader()

  const manifestObj = bundle['manifest.json'] as OutputAsset

  await plugin.generateBundle.call(
    context,
    options,
    bundle,
    false,
  )

  const manifest: ChromeExtensionManifest = JSON.parse(
    manifestObj.source as string,
  )

  expect(manifest.background!.scripts).toContain(
    'mock-file-name',
  )
})

test('set background script to persistent', async () => {
  const bundle = cloneObject(originalBundle)
  const plugin = simpleReloader()

  const manifestObj = bundle['manifest.json'] as OutputAsset

  await plugin.generateBundle.call(
    context,
    options,
    bundle,
    false,
  )

  const manifest: ChromeExtensionManifest = JSON.parse(
    manifestObj.source as string,
  )

  expect(manifest.background!.persistent).toBe(true)
})

test('add reloader script to content scripts', async () => {
  const bundle = cloneObject(originalBundle)
  const plugin = simpleReloader()

  const manifestObj = bundle['manifest.json'] as OutputAsset

  await plugin.generateBundle.call(
    context,
    options,
    bundle,
    false,
  )

  const manifest: ChromeExtensionManifest = JSON.parse(
    manifestObj.source as string,
  )

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
