import watch from '@bumble/rollup-watch-next'
import { copyFile } from 'fs-extra'
import config from './fixtures/watch/rollup.config.js'

let watcher

beforeEach(async () => {
  await copyFile(
    'tests/html-inputs/fixtures/watch/popup1.html',
    'tests/html-inputs/fixtures/watch/popup.html',
  )
})

afterEach(async () => {
  watcher && watcher.close()
  watcher = null
})

test.skip('reloads entries when html file changes', async () => {
  const spy = jest.fn()

  watcher = watch(config, spy)

  expect.assertions(4)

  const {
    value: { result: bundle1 },
  } = await watcher.next('BUNDLE_END')

  const { output: output1 } = await bundle1.generate(
    config.output,
  )

  const chunks1 = output1.filter(({ isAsset }) => !isAsset)
  const assets1 = output1.filter(({ isAsset }) => isAsset)

  expect(chunks1.length).toBe(4)
  expect(assets1.length).toBe(2)

  copyFile(
    'tests/html-inputs/fixtures/watch/popup2.html',
    'tests/html-inputs/fixtures/watch/popup.html',
  )

  const {
    value: { result: bundle2 },
  } = await watcher.next('BUNDLE_END')

  const { output: output2 } = await bundle2.generate(
    config.output,
  )

  const chunks2 = output2.filter(({ isAsset }) => !isAsset)
  const assets2 = output2.filter(({ isAsset }) => isAsset)

  expect(chunks2.length).toBe(4)
  expect(assets2.length).toBe(2)
}, 60000)
