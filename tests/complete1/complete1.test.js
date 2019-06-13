import { rollup } from 'rollup'
import watch from '@bumble/rollup-watch-next'
import { copyFile } from 'fs-extra'
import config from './rollup.config'

const consoleLog = console.log
console.log = jest.fn(consoleLog)
let watcher

beforeEach(async () => {
  await copyFile(
    'tests/complete1/fixtures/src/manifest-1.json',
    'tests/complete1/fixtures/src/manifest.json',
  )
  await copyFile(
    'tests/complete1/fixtures/src/popup1.html',
    'tests/complete1/fixtures/src/popup.html',
  )
})

afterEach(async () => {
  watcher && watcher.close()
  watcher = null

  await copyFile(
    'tests/complete1/fixtures/src/manifest-1.json',
    'tests/complete1/fixtures/src/manifest.json',
  )
  await copyFile(
    'tests/complete1/fixtures/src/popup1.html',
    'tests/complete1/fixtures/src/popup.html',
  )
})

test('bundles chunks and assets', async () => {
  const bundle = await rollup(config)
  const { output } = await bundle.generate(config.output)

  const chunks = output.filter(({ isAsset }) => !isAsset)
  const assets = output.filter(({ isAsset }) => isAsset)

  expect(chunks.length).toBe(3)
  expect(assets.length).toBe(4)
})

test('reloads entries when manifest changes', async () => {
  const spy = jest.fn()

  watcher = watch(config, spy)

  const {
    value: { result: bundle1 },
  } = await watcher.next('BUNDLE_END')

  const { output: output1 } = await bundle1.generate(
    config.output,
  )

  const chunks1 = output1.filter(({ isAsset }) => !isAsset)
  const assets1 = output1.filter(({ isAsset }) => isAsset)

  expect(chunks1.length).toBe(3)
  expect(assets1.length).toBe(4)

  copyFile(
    'tests/complete1/fixtures/src/manifest-2.json',
    'tests/complete1/fixtures/src/manifest.json',
  )

  const {
    value: { result: bundle2 },
  } = await watcher.next('BUNDLE_END')

  const { output: output2 } = await bundle2.generate(
    config.output,
  )

  const chunks2 = output2.filter(({ isAsset }) => !isAsset)
  const assets2 = output2.filter(({ isAsset }) => isAsset)

  expect(chunks2.length).toBe(3)
  expect(assets2.length).toBe(4)
}, 60000)

test.only('derives correct permissions', async () => {
  const bundle = await rollup(config)
  const { output } = await bundle.generate(config.output)

  const assets = output.filter(({ isAsset }) => isAsset)

  const manifestAsset = assets.find(({ fileName }) =>
    fileName.endsWith('manifest.json'),
  )

  expect(manifestAsset).toBeDefined()

  const manifest = JSON.parse(manifestAsset.source)

  expect(manifest.permissions).toEqual(['contextMenus'])
})
