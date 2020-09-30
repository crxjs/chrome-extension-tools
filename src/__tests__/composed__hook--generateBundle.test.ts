import { OutputBundle } from 'rollup'
import { RollupOptions } from 'rollup'
import { chromeExtension } from '..'
import { buildCRX } from '../../__fixtures__/build-basic-crx'
import {
  InversePromise,
  inversePromise,
} from '../../__fixtures__/inversePromise'
import { context as minimal } from '../../__fixtures__/minimal-plugin-context'
import { context } from '../../__fixtures__/plugin-context'
import { getExtPath } from '../../__fixtures__/utils'

const config: RollupOptions = {
  input: getExtPath('basic/manifest.json'),
}

const bundlePromise: InversePromise<OutputBundle> = inversePromise()
beforeAll(
  buildCRX(getExtPath('basic/rollup.config.js'), (result) => {
    bundlePromise.resolve(result.bundle)
  }),
  10000,
)

const { _plugins, ...plugin } = chromeExtension({
  verbose: false,
})

jest.spyOn(_plugins.manifest, 'generateBundle')
jest.spyOn(_plugins.validate, 'generateBundle')

test('calls manifest, and validate hooks', async () => {
  const bundle = await bundlePromise
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
