import { rollup } from 'rollup'
import config from './rollup.config'

test('bundles chunks and assets', async () => {
  const bundle = await rollup(config)
  const { output } = await bundle.write(config.output)

  const chunks = output.filter(({ isAsset }) => !isAsset)
  const assets = output.filter(({ isAsset }) => isAsset)

  expect(chunks.length).toBe(2)
  expect(assets.length).toBe(3)
}, 7000)

test('outputs entry files to correct path', async () => {
  const bundle = await rollup(config)
  const { output } = await bundle.generate(config.output)

  const chunks = output.filter(({ isAsset }) => !isAsset)

  const background = chunks.find(({ fileName }) =>
    fileName.includes('background'),
  )
  const content = chunks.find(({ fileName }) =>
    fileName.includes('content'),
  )

  expect(background).toBeDefined()
  expect(background.fileName).toBe('scripts/background.js')

  expect(content).toBeDefined()
  expect(content.fileName).toBe('scripts/content.js')
})

test('outputs module loaders with correct path', async () => {
  const bundle = await rollup(config)
  const { output } = await bundle.generate(config.output)

  const assets = output.filter(({ isAsset }) => isAsset)

  const background = assets.find(({ fileName }) =>
    fileName.includes('background'),
  )
  const content = assets.find(({ fileName }) =>
    fileName.includes('content'),
  )

  expect(background).toBeDefined()
  expect(background.source).toMatch(
    /import\('\.\.\/scripts\/background\.js'\)\.then\(triggerEvents\)/,
  )

  expect(content).toBeDefined()
  expect(content.source).toMatch(
    /import\('\.\.\/scripts\/content\.js'\)\.then\(triggerEvents\)/,
  )
})
