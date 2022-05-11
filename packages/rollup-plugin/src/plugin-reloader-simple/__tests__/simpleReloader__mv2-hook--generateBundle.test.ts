import { NormalizedOutputOptions } from 'rollup'
import { EmittedFile, OutputAsset } from 'rollup'
import { simpleReloader, _internalCache } from '..'
import { buildCRX } from '../../../__fixtures__/build-crx'
import { context } from '../../../__fixtures__/plugin-context'
import { cloneObject } from '../../manifest-input/cloneObject'
import {
  backgroundPageReloader,
  contentScriptReloader,
  timestampFilename,
} from '../CONSTANTS'

context.getFileName.mockImplementation(() => 'mock-file-name')

const buildPromise = buildCRX()

const contentJs = expect.stringMatching(/assets\/content.+?\.js/)

beforeEach(() => {
  process.env.ROLLUP_WATCH = 'true'
})

afterEach(jest.clearAllMocks)

test('emit assets', async () => {
  const { bundle } = cloneObject(await buildPromise)
  const plugin = simpleReloader()!

  await plugin.generateBundle.call(
    context,
    {} as NormalizedOutputOptions,
    bundle,
    false,
  )

  expect(context.emitFile).toBeCalledTimes(3)

  expect(context.emitFile).toBeCalledWith<[EmittedFile]>({
    type: 'asset',
    // This file is used between builds and has to be "fileName"!
    fileName: timestampFilename,
    source: expect.any(String),
  })

  expect(context.emitFile).toBeCalledWith<[EmittedFile]>({
    type: 'asset',
    name: backgroundPageReloader,
    source: expect.any(String),
  })
  expect(context.emitFile).toBeCalledWith<[EmittedFile]>({
    type: 'asset',
    name: contentScriptReloader,
    source: expect.any(String),
  })
})

test('updates manifest in bundle', async () => {
  const { bundle } = cloneObject(await buildPromise)
  const plugin = simpleReloader()!

  const manifestObj = bundle['manifest.json'] as OutputAsset
  const manifestClone = cloneObject(manifestObj)

  expect(manifestObj).toEqual(manifestClone)

  await plugin.generateBundle.call(
    context,
    {} as NormalizedOutputOptions,
    bundle,
    false,
  )

  expect(manifestObj).toBe(bundle['manifest.json'])
  expect(manifestObj).not.toEqual(manifestClone)

  // @ts-expect-error OutputAsset type is wrong
  expect(manifestObj).toEqual<OutputAsset>({
    fileName: 'manifest.json',
    type: 'asset',
    source: expect.any(String),
    isAsset: true,
  })

  const manifest: chrome.runtime.ManifestV2 = JSON.parse(
    manifestObj.source as string,
  )

  expect(manifest).toMatchObject<chrome.runtime.ManifestV2>({
    manifest_version: 2,
    name: expect.any(String),
    version: expect.any(String),
    description: expect.any(String),
  })
})

test('set manifest description', async () => {
  const { bundle } = cloneObject(await buildPromise)
  const plugin = simpleReloader()!

  const manifestObj = bundle['manifest.json'] as OutputAsset

  await plugin.generateBundle.call(
    context,
    {} as NormalizedOutputOptions,
    bundle,
    false,
  )

  const manifest: chrome.runtime.ManifestV2 = JSON.parse(
    manifestObj.source as string,
  )

  expect(manifest.description).toBe(_internalCache.loadMessage)
})

test('add reloader script to background', async () => {
  const { bundle } = cloneObject(await buildPromise)
  const plugin = simpleReloader()!

  const manifestObj = bundle['manifest.json'] as OutputAsset

  await plugin.generateBundle.call(
    context,
    {} as NormalizedOutputOptions,
    bundle,
    false,
  )

  const manifest: chrome.runtime.ManifestV2 = JSON.parse(
    manifestObj.source as string,
  )

  expect(manifest.background!.scripts).toContain('mock-file-name')
})

test('set background script to persistent', async () => {
  const { bundle } = cloneObject(await buildPromise)
  const plugin = simpleReloader()!

  const manifestObj = bundle['manifest.json'] as OutputAsset

  await plugin.generateBundle.call(
    context,
    {} as NormalizedOutputOptions,
    bundle,
    false,
  )

  const manifest: chrome.runtime.ManifestV2 = JSON.parse(
    manifestObj.source as string,
  )

  expect(manifest.background!.persistent).toBe(true)
})

test('add reloader script to content scripts', async () => {
  const { bundle } = cloneObject(await buildPromise)
  const plugin = simpleReloader()!

  const manifestObj = bundle['manifest.json'] as OutputAsset

  await plugin.generateBundle.call(
    context,
    {} as NormalizedOutputOptions,
    bundle,
    false,
  )

  const manifest: chrome.runtime.ManifestV2 = JSON.parse(
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

test('Errors if manifest is not in the bundle', async () => {
  const { bundle } = cloneObject(await buildPromise)
  const plugin = simpleReloader()!

  expect.assertions(2)

  delete bundle['manifest.json']

  const errorMessage = 'No manifest.json in the rollup output bundle.'

  try {
    await plugin.generateBundle.call(
      context,
      {} as NormalizedOutputOptions,
      bundle,
      false,
    )
  } catch (error) {
    expect(error).toEqual(new Error(errorMessage))
    expect(context.error).toBeCalledWith(errorMessage)
  }
})

test('Errors if cache.bgScriptPath is undefined', async () => {
  const { bundle } = cloneObject(await buildPromise)
  const plugin = simpleReloader()!

  expect.assertions(1)

  // @ts-expect-error This can return undefined in the wild
  context.getFileName.mockImplementation((id) => {
    return id !== backgroundPageReloader ? id : undefined
  })

  try {
    await plugin.generateBundle.call(
      context,
      {} as NormalizedOutputOptions,
      bundle,
      false,
    )
  } catch (error) {
    expect(context.error).toBeCalledWith('cache.bgScriptPath is undefined')
  }
})

test('Errors if cache.ctScriptPath is undefined', async () => {
  const { bundle } = cloneObject(await buildPromise)
  const plugin = simpleReloader()!

  expect.assertions(1)

  // @ts-expect-error This can return undefined in the wild
  context.getFileName.mockImplementation((id) => {
    return id !== contentScriptReloader ? id : undefined
  })

  try {
    await plugin.generateBundle.call(
      context,
      {} as NormalizedOutputOptions,
      bundle,
      false,
    )
  } catch (error) {
    expect(context.error).toBeCalledWith('cache.ctScriptPath is undefined')
  }
})
