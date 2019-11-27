import { RollupOptions, OutputBundle } from 'rollup'
import { chromeExtension } from '..'
import { context as minimal } from '../../__fixtures__/minimal-plugin-context'
import { context } from '../../__fixtures__/plugin-context'
import { getExtPath } from '../../__fixtures__/utils'

const config: RollupOptions = {
  input: getExtPath('basic/manifest.json'),
}

const bundle: OutputBundle = require(getExtPath(
  'basic-bundle.json',
))

const { _plugins, ...plugin } = chromeExtension({ verbose: false })

jest.spyOn(_plugins.manifest, 'generateBundle')
jest.spyOn(_plugins.validate, 'generateBundle')

test('calls manifest, and validate hooks', async () => {
  const options = plugin.options.call(minimal, config) || config
  await plugin.buildStart.call(context, options)
  await plugin.generateBundle.call(
    context,
    options,
    bundle,
    false,
  )

  expect(_plugins.manifest.generateBundle).toBeCalled()
  expect(_plugins.validate.generateBundle).toBeCalled()
})
