import { manifestInput, DynamicImportWrapper } from '../index'
import { context } from '../../../__fixtures__/minimal-plugin-context'
import { getExtPath } from '../../../__fixtures__/utils'
import { RollupOptions } from 'rollup'

const sls = require('../setupLoaderScript')
jest.spyOn(sls, 'setupLoaderScript')
const { setupLoaderScript } = sls

test('sets up loader script', () => {
  const dynamicImportWrapper: DynamicImportWrapper = {
    wakeEvents: [
      'chrome.runtime.onMessage',
      'chrome.tabs.onUpdated',
    ],
  }

  manifestInput({ dynamicImportWrapper })

  expect(setupLoaderScript).toBeCalled()
  expect(setupLoaderScript).toBeCalledWith(dynamicImportWrapper)
})

test('returns plugin with srcDir getter', () => {
  const plugin = manifestInput()

  expect(plugin.srcDir).toBeNull()

  // Rollup config
  const config: RollupOptions = {
    input: getExtPath('basic/manifest.json'),
  }

  plugin.options.call(context, config)

  expect(plugin.srcDir).toBe(getExtPath('basic'))
})
