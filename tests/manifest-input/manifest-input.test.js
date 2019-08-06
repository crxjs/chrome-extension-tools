import { rollup } from 'rollup'
import config from './rollup.config'

console.log = jest.fn()

test('bundles chunks and assets', async () => {
  const bundle = await rollup(config)
  const { output } = await bundle.generate(config.output)

  const chunks = output.filter(({ isAsset }) => !isAsset)
  const assets = output.filter(({ isAsset }) => isAsset)

  expect(chunks.length).toBe(3)
  expect(assets.length).toBe(5)
})

test('wraps background scripts in dynamic import', async () => {
  const bundle = await rollup(config)
  const { output } = await bundle.generate(config.output)

  const bgWrapperAsset = output.find(
    ({ isAsset, fileName }) =>
      isAsset && fileName.includes('background'),
  )

  expect(bgWrapperAsset).toBeDefined()

  expect(bgWrapperAsset.source).toContain(
    'import(\'../background.js\')',
  )
  expect(bgWrapperAsset.source).not.toContain(
    /\.then\(delay\([\d]+?\)\)/,
  )
  expect(bgWrapperAsset.source).not.toContain('// %DELAY%')
})

test('updates manifest script paths', async () => {
  const bundle = await rollup(config)
  const { output } = await bundle.generate(config.output)

  const manifestAsset = output.find(
    ({ isAsset, fileName }) =>
      isAsset && fileName.includes('manifest'),
  )

  expect(manifestAsset).toBeDefined()

  const manifest = JSON.parse(manifestAsset.source)

  expect(manifest.background).toBeDefined()
  expect(manifest.background.scripts).toBeDefined()
  expect(manifest.background.scripts.length).toBe(1)

  const [bgScript] = manifest.background.scripts

  expect(bgScript).not.toBe('background.js')
  expect(bgScript.startsWith('assets/background')).toBe(true)
  expect(bgScript.endsWith('.js')).toBe(true)
})

test('wraps content scripts in dynamic import', async () => {
  const bundle = await rollup(config)
  const { output } = await bundle.generate(config.output)

  const ctWrapperAsset = output.find(
    ({ isAsset, fileName }) =>
      isAsset && fileName.includes('content'),
  )

  expect(ctWrapperAsset).toBeDefined()

  expect(ctWrapperAsset.source).toContain(
    'import(\'../content.js\')',
  )
  expect(ctWrapperAsset.source).not.toContain(
    /\.then\(delay\([\d]+?\)\)/,
  )
  expect(ctWrapperAsset.source).not.toContain('// %DELAY%')
})
