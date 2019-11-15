import { RollupOptions } from 'rollup'
import { context } from '../../__fixtures__/minimal-plugin-context'
import { getExtPath } from '../../__fixtures__/utils'
import { chromeExtension } from '../index'

// Create plugin
const { options, _plugins } = chromeExtension()

// Mock composed plugins
_plugins.manifest.options = jest.fn(_plugins.manifest.options)
_plugins.html.options = jest.fn(_plugins.html.options)

// Rollup config
const config: RollupOptions = {
  input: getExtPath('basic/manifest.json'),
}

// Call options hook once
const result = options.call(context, config)

test('matches expected output', () => {
  expect(result).toMatchObject({
    input: {
      background: getExtPath('basic/background.js'),
      content: getExtPath('basic/content.js'),
    },
  })
})

test('calls all secondary hooks', () => {
  expect(_plugins.manifest.options).toBeCalled()
  expect(_plugins.html.options).toBeCalled()
})
