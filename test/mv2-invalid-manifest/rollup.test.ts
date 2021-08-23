import { isErrorLike } from '$src/helpers'
import { rollup, RollupOptions } from 'rollup'

const config = require('./rollup.config.js') as RollupOptions

test('warns and throws if the manifest is invalid', async () => {
  try {
    const bundle = await rollup(config)
    await bundle.generate(config.output as any)
  } catch (error) {
    if (!isErrorLike(error)) throw new Error(`Expected error, got ${error}`)

    expect(error.message).toMatch('There were problems with the extension manifest.')
  }
}, 30000)
