import assert from 'assert'

import fs from 'fs-extra'

import sinon from 'sinon'
import { rollup } from 'rollup'

import basic from './fixtures/basic/rollup.config'
import withAssets from './fixtures/with-assets/rollup.config'
import withImage from './fixtures/with-image/rollup.config'
import withStyles from './fixtures/with-styles/rollup.config'

afterEach(() => {
  sinon.restore()
})

test('rollup bundles chunks', async () => {
  const bundle = await rollup(basic)
  const { output } = await bundle.generate(basic.output)

  assert(output.length === 4)
})

test('withAssets', async () => {
  const bundle = await rollup(withAssets)
  const { output } = await bundle.generate(withAssets.output)

  const chunks = output.filter(({ isAsset }) => !isAsset)
  const assets = output.filter(({ isAsset }) => isAsset)

  expect(chunks.length).toBe(3)
  expect(assets.length).toBe(2)
})

test('withImage', async () => {
  const bundle = await rollup(withImage)
  const { output } = await bundle.generate(withImage.output)

  const chunks = output.filter(({ isAsset }) => !isAsset)
  const assets = output.filter(({ isAsset }) => isAsset)

  expect(chunks.length).toBe(3)
  expect(assets.length).toBe(2)
})

test('withStyles', async () => {
  const bundle = await rollup(withStyles)
  const { output } = await bundle.generate(withAssets.output)

  const chunks = output.filter(({ isAsset }) => !isAsset)
  const assets = output.filter(({ isAsset }) => isAsset)

  expect(chunks.length).toBe(3)
  expect(assets.length).toBe(1)
})

test('rollup writes html files', async () => {
  const stub = sinon.stub(fs, 'writeFile').usingPromise(Promise)
  await fs.remove('tests/fixtures/dest')

  const bundle = await rollup(basic)
  await bundle.write(basic.output)

  assert(stub.calledTwice)
  assert(stub.calledWith('tests/fixtures/dest/options.html'))
  assert(stub.calledWith('tests/fixtures/dest/popup.html'))
})
