import { RollupOptions } from 'rollup'
import { rollup } from 'rollup'
import { requireExtFile } from '../__fixtures__/utils'

const config = requireExtFile<RollupOptions>(__filename, 'rollup.config.js')

test('warns and throws if the manifest is invalid', async () => {
  try {
    const bundle = await rollup(config)
    await bundle.generate(config.output as any)
  } catch (error) {
    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).toMatch('There were problems with the extension manifest.')
  }
}, 30000)
