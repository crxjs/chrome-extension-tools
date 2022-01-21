import { rollup, RollupOptions } from 'rollup'
import config from './rollup.config'

process.chdir(__dirname)

test('errors if the manifest is invalid', async () => {
  expect.assertions(1)
  await expect(
    rollup(config as RollupOptions),
  ).rejects.toMatchSnapshot('error')
})
