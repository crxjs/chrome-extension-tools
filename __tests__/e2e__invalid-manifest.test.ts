import { rollup } from 'rollup'
import { getExtPath } from '../__fixtures__/utils'

const { default: config } = require(getExtPath(
  'invalid-manifest/rollup.config.js',
))

// const manifestJson = getExtPath('invalid-manifest/manifest.json')
// const background = getExtPath('invalid-manifest/background.js')

test('warns and throws if the manifest is invalid', async () => {
  const consoleWarn = console.warn
  console.warn = jest.fn()
  
  const bundle = await rollup(config)

  try {
    await bundle.generate(config.output)
  } catch (error) {
    expect(error).toEqual(
      new Error(
        'There were problems with the extension manifest.',
      ),
    )

    expect(console.warn).toBeCalledWith(
      JSON.stringify({
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
          description:
            'One integer specifying the version of the manifest file format your package requires.',
          enum: [2],
          minimum: 2,
          maximum: 2,
        },
        data: 'B',
      }, undefined, 2),
    )
  }

  console.warn = consoleWarn
})
