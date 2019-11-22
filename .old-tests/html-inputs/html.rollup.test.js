import sinon from 'sinon'
import { rollup } from 'rollup'

const build = async (config) => {
  const bundle = await rollup(config)
  const { output } = await bundle.generate(config.output)
  // const { output } = await bundle.write(config.output)

  const chunks = output.filter(({ isAsset }) => !isAsset)
  const assets = output.filter(({ isAsset }) => isAsset)

  return { chunks, assets }
}

afterEach(() => {
  sinon.restore()
})

test('basic', async () => {
  const config = require('./fixtures/basic/rollup.config')

  const { chunks, assets } = await build(config)

  expect(chunks.length).toBe(4)
  expect(assets.length).toBe(2)

  const optionsHtml = assets.find(({ fileName }) =>
    fileName.endsWith('options.html'),
  )

  expect(optionsHtml.source.includes('options.js')).toBe(true)
  expect(optionsHtml.source.includes('options.jsx')).toBe(false)
})

test('withImage', async () => {
  const config = require('./fixtures/with-image/rollup.config')

  const { chunks, assets } = await build(config)

  const favicon = assets.find(({ fileName }) =>
    fileName.endsWith('favicon.png'),
  )
  const icon16 = assets.find(({ fileName }) =>
    fileName.endsWith('icon-on-16.png'),
  )
  const html = assets.find(({ fileName }) =>
    fileName.endsWith('popup.html'),
  )

  expect(favicon).toBeDefined()
  expect(icon16).toBeDefined()
  expect(html).toBeDefined()

  expect(chunks.length).toBe(3)
  expect(assets.length).toBe(3)
})

test('withStyles', async () => {
  const config = require('./fixtures/with-styles/rollup.config')

  const { chunks, assets } = await build(config)

  expect(chunks.length).toBe(3)
  expect(assets.length).toBe(2)
})

test('withTypeScript', async () => {
  const config = require('./fixtures/with-ts/rollup.config')

  const { chunks, assets } = await build(config)

  expect(chunks.length).toBe(2)
  expect(assets.length).toBe(2)

  const options = assets.find(({ fileName }) =>
    fileName.endsWith('options.html'),
  )

  expect(options.source).toMatch(/options\.js/)
  expect(options.source).not.toMatch(/options\.tsx/)

  const popup = assets.find(({ fileName }) =>
    fileName.endsWith('popup.html'),
  )

  expect(popup.source).toMatch(/popup\.js/)
  expect(popup.source).not.toMatch(/popup\.ts/)
})
