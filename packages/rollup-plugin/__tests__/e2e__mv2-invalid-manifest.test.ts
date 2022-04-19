import { RollupOptions } from 'rollup'
import { rollup } from 'rollup'
import { isErrorLike } from '../src/helpers'
import { requireExtFile } from '../__fixtures__/utils'

const config = requireExtFile(__filename, 'rollup.config.js') as RollupOptions

test('warns and throws if the manifest is invalid', async () => {
  try {
    const bundle = await rollup(config)
    await bundle.generate(config.output as any)
  } catch (error) {
    if (!isErrorLike(error)) throw new Error(`Expected error, got ${error}`)

    expect(error.message).toMatch('There were problems with the extension manifest.')
  }
}, 30000)
