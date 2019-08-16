import sinon from 'sinon'
import { rollup } from 'rollup'

import basic from './fixtures/basic/rollup.config'
import withAssets from './fixtures/with-assets/rollup.config'
import withImage from './fixtures/with-image/rollup.config'
import withStyles from './fixtures/with-styles/rollup.config'
import withTypeScript from './fixtures/with-ts/rollup.config'

const build = async (config) => {
  const bundle = await rollup(config)
  const { output } = await bundle.write(config.output)

  const chunks = output.filter(({ isAsset }) => !isAsset)
  const assets = output.filter(({ isAsset }) => isAsset)

  return { chunks, assets }
}

afterEach(() => {
  sinon.restore()
})

test('basic', async () => {
  const { chunks, assets } = await build(basic)

  expect(chunks.length).toBe(4)
  expect(assets.length).toBe(3)

  const optionsHtml = assets.find(({ fileName }) =>
    fileName.endsWith('options.html'),
  )

  expect(optionsHtml.source.includes('options.js')).toBe(true)
  expect(optionsHtml.source.includes('options.jsx')).toBe(false)
})

test('withAssets', async () => {
  const { chunks, assets } = await build(withAssets)

  expect(chunks.length).toBe(3)
  expect(assets.length).toBe(3)
})

test('withImage', async () => {
  const { chunks, assets } = await build(withImage)

  expect(chunks.length).toBe(3)
  expect(assets.length).toBe(2)
})

test('withStyles', async () => {
  const { chunks, assets } = await build(withStyles)

  expect(chunks.length).toBe(3)
  expect(assets.length).toBe(2)
})

test('withTypeScript', async () => {
  const { chunks, assets } = await build(withTypeScript)

  expect(chunks.length).toBe(2)
  expect(assets.length).toBe(3)

  const optionsHtml = assets.find(({ fileName }) =>
    fileName.endsWith('options.html'),
  )

  expect(optionsHtml.source.includes('options.js')).toBe(true)
  expect(optionsHtml.source.includes('options.tsx')).toBe(false)
})
