import { RollupOptions } from 'rollup'
import { chromeExtension } from '..'
import { context as minimal } from '../../__fixtures__/minimal-plugin-context'
import { context } from '../../__fixtures__/plugin-context'
import { getExtPath } from '../../__fixtures__/utils'

const config: RollupOptions = {
  input: getExtPath('kitchen-sink/manifest.json'),
}

const { _plugins, ...plugin } = chromeExtension()

jest.spyOn(_plugins.manifest, 'buildStart')
jest.spyOn(_plugins.html, 'buildStart')

test('calls manifest and html hooks', () => {
  const options = plugin.options.call(minimal, config) || config
  plugin.buildStart.call(context, options)

  expect(_plugins.manifest.buildStart).toBeCalled()
  expect(_plugins.html.buildStart).toBeCalled()
})
