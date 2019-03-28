import { rollup } from 'rollup'
import config from '../clip-selector/fixtures/src/rollup.config'

test('bundles entry chunks as async iife', async () => {
  const bundle = await rollup(config)
  const { output } = await bundle.generate(config.output)

  const chunks = output.filter(({ isAsset }) => !isAsset)
  const assets = output.filter(({ isAsset }) => isAsset)

  expect(chunks.length).toBe(1)
  expect(assets.length).toBe(4)
})
