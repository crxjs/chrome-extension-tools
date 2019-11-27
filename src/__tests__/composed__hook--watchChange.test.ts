import { RollupOptions } from 'rollup'
import { chromeExtension } from '..'
import { context as minimal } from '../../__fixtures__/minimal-plugin-context'
import { context } from '../../__fixtures__/plugin-context'
import { getExtPath } from '../../__fixtures__/utils'

const config: RollupOptions = {
  input: getExtPath('basic/manifest.json'),
}

const { _plugins, ...plugin } = chromeExtension({ verbose: false })

jest.spyOn(_plugins.manifest, 'watchChange')
jest.spyOn(_plugins.html, 'watchChange')

test('calls manifest and html hooks', async () => {
  const id = 'background.js'

  const options = plugin.options.call(minimal, config) || config
  await plugin.buildStart.call(context, options)
  plugin.watchChange(id)

  expect(_plugins.manifest.watchChange).toBeCalledWith(id)
  expect(_plugins.html.watchChange).toBeCalledWith(id)
})
