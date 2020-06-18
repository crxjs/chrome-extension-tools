import { manifestInput } from '../index'
import { context } from '../../../__fixtures__/minimal-plugin-context'
import { getExtPath } from '../../../__fixtures__/utils'
import { RollupOptions } from 'rollup'
import { DynamicImportWrapperOptions } from '../dynamicImportWrapper'

const diw = require('../dynamicImportWrapper')
jest.spyOn(diw, 'prepImportWrapperScript')
const { prepImportWrapperScript } = diw

test('sets up explicit import wrapper script', () => {
  const dynamicImportWrapper: DynamicImportWrapperOptions = {
    wakeEvents: ['runtime.onInstalled', 'tabs.onUpdated'],
  }

  manifestInput({ dynamicImportWrapper })

  expect(prepImportWrapperScript).toBeCalledTimes(1)
  expect(prepImportWrapperScript).toBeCalledWith(
    dynamicImportWrapper,
  )
  expect(prepImportWrapperScript).toReturnWith(
    expect.stringContaining('BUNDLE IMPORTS STUB'),
  )

  // TODO: check for static replacements
})

test('sets up explicit import wrapper script', () => {
  const dynamicImportWrapper: DynamicImportWrapperOptions = {}

  manifestInput({ dynamicImportWrapper })

  expect(prepImportWrapperScript).toBeCalled()
  expect(prepImportWrapperScript).toBeCalledWith(
    dynamicImportWrapper,
  )

  expect(prepImportWrapperScript).toReturnWith(
    expect.stringContaining('BUNDLE IMPORTS STUB'),
  )

  // TODO: check for static replacements
})

test('returns plugin with srcDir getter', () => {
  const plugin = manifestInput()

  expect(plugin.srcDir).toBeNull()

  // Rollup config
  const options: RollupOptions = {
    input: getExtPath('basic/manifest.json'),
  }

  plugin.options.call(context, options)

  expect(plugin.srcDir).toBe(getExtPath('basic'))
})
