import sinon from 'sinon'
import { rollup } from 'rollup'

import basic from './fixtures/basic/rollup.config'
import withAssets from './fixtures/with-assets/rollup.config'
import withImage from './fixtures/with-image/rollup.config'
import withStyles from './fixtures/with-styles/rollup.config'

afterEach(() => {
  sinon.restore()
})

test('basic', async () => {
  const bundle = await rollup(basic)
  const { output } = await bundle.generate(basic.output)

  const chunks = output.filter(({ isAsset }) => !isAsset)
  const assets = output.filter(({ isAsset }) => isAsset)

  expect(chunks.length).toBe(4)

  // NEXT: 2 html files with the same asset should not emit two assets
  //  - See options.html and popup.html
  expect(assets.length).toBe(4)
})

test('withAssets', async () => {
  const bundle = await rollup(withAssets)
  const { output } = await bundle.generate(withAssets.output)

  const chunks = output.filter(({ isAsset }) => !isAsset)
  const assets = output.filter(({ isAsset }) => isAsset)

  expect(chunks.length).toBe(3)
  expect(assets.length).toBe(3)
})

test('withImage', async () => {
  const bundle = await rollup(withImage)
  const { output } = await bundle.generate(withImage.output)

  const chunks = output.filter(({ isAsset }) => !isAsset)
  const assets = output.filter(({ isAsset }) => isAsset)

  expect(chunks.length).toBe(3)
  expect(assets.length).toBe(3)
})

test('withStyles', async () => {
  const bundle = await rollup(withStyles)
  const { output } = await bundle.generate(withAssets.output)

  const chunks = output.filter(({ isAsset }) => !isAsset)
  const assets = output.filter(({ isAsset }) => isAsset)

  expect(chunks.length).toBe(3)
  expect(assets.length).toBe(2)
})
