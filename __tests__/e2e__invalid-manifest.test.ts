import { RollupOptions } from 'rollup'
import { rollup } from 'rollup'
import { requireExtFile } from '../__fixtures__/utils'

const config = requireExtFile<RollupOptions>(__filename, 'rollup.config.js')

test('warns and throws if the manifest is invalid', async () => {
  try {
    const bundle = await rollup(config)
    await bundle.generate(config.output as any)
  } catch (error) {
    expect(error).toEqual(new Error('There were problems with the extension manifest.'))

    expect(console.warn).toBeCalledWith(
      JSON.stringify(
        {
          keyword: 'type',
          dataPath: '.manifest_version',
          schemaPath: '#/properties/manifest_version/type',
          params: {
            type: 'number',
          },
          message: 'should be number',
          schema: 'number',
          parentSchema: {
            type: 'number',
            description: 'One integer specifying the version of the manifest file format your package requires.',
            enum: [2],
            minimum: 2,
            maximum: 2,
          },
          data: 'B',
        },
        undefined,
        2,
      ),
    )
  }
}, 10000)
