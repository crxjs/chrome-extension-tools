import { rollup } from 'rollup'
import config from './rollup.config'

test('bundles chunks and assets', async () => {
  const bundle = await rollup(config)
  const { output } = await bundle.generate(config.output)

  const chunks = output.filter(({ isAsset }) => !isAsset)
  const assets = output.filter(({ isAsset }) => isAsset)

  expect(chunks.length).toBe(1)
  expect(assets.length).toBe(5)
}, 7000)
