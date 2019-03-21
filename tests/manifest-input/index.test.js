import { rollup } from 'rollup'
import config from './fixtures/basic/rollup.config'

test('rollup bundles chunks and assets', async () => {
  const bundle = await rollup(config)
  const { output } = await bundle.generate(config.output)

  expect(output.length).toBe(6)
})
