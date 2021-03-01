import { manifestInput } from '../index'
import { context } from '../../../__fixtures__/minimal-plugin-context'
import { getExtPath } from '../../../__fixtures__/utils'
import { RollupOptions } from 'rollup'
import { DynamicImportWrapperOptions } from '../dynamicImportWrapper'

const diw = require('../dynamicImportWrapper')
jest.spyOn(diw, 'prepImportWrapperScript')
const { prepImportWrapperScript } = diw

afterEach(jest.clearAllMocks)

test('sets up explicit import wrapper script', () => {
  const dynamicImportWrapper: DynamicImportWrapperOptions = {
    wakeEvents: ['runtime.onInstalled', 'tabs.onUpdated'],
  }

  manifestInput({ dynamicImportWrapper })

  expect(prepImportWrapperScript).toBeCalledTimes(1)
  expect(prepImportWrapperScript).toBeCalledWith(
    dynamicImportWrapper,
  )

  // Is stubbed wrapper script
  expect(prepImportWrapperScript).toReturnWith(
    expect.stringContaining('BUNDLE IMPORTS STUB'),
  )
  /* -------------- STATIC REPLACEMENTS -------------- */

  // %DELAY% should ALWAYS be replaced
  expect(prepImportWrapperScript).not.toReturnWith(
    expect.stringContaining('%DELAY%'),
  )
  expect(prepImportWrapperScript).toReturnWith(
    expect.stringContaining(JSON.stringify(0)),
  )

  // %PATH% should NEVER be replaced at this stage
  expect(prepImportWrapperScript).toReturnWith(
    expect.stringContaining('%PATH%'),
  )

  /* ------------ CONDITIONAL REPLACEMENTS ----------- */

  // %EVENTS% should be replaced in explicit wrapper
  expect(prepImportWrapperScript).not.toReturnWith(
    expect.stringContaining('%EVENTS%'),
  )
  expect(prepImportWrapperScript).toReturnWith(
    expect.stringContaining(
      JSON.stringify(dynamicImportWrapper.wakeEvents),
    ),
  )

  // %EXCLUDE% should NOT be replaced in explicit wrapper
  expect(prepImportWrapperScript).toReturnWith(
    expect.stringContaining('%EXCLUDE%'),
  )
})

test('sets up implicit import wrapper script', () => {
  const dynamicImportWrapper: DynamicImportWrapperOptions = {}

  manifestInput({ dynamicImportWrapper })

  expect(prepImportWrapperScript).toBeCalled()
  expect(prepImportWrapperScript).toBeCalledWith(
    dynamicImportWrapper,
  )

  // Is stubbed wrapper script
  expect(prepImportWrapperScript).toReturnWith(
    expect.stringContaining('BUNDLE IMPORTS STUB'),
  )
  /* -------------- STATIC REPLACEMENTS -------------- */

  // %DELAY% should ALWAYS be replaced
  expect(prepImportWrapperScript).not.toReturnWith(
    expect.stringContaining('%DELAY%'),
  )
  expect(prepImportWrapperScript).toReturnWith(
    expect.stringContaining(JSON.stringify(0)),
  )

  // %PATH% should NEVER be replaced at this stage
  expect(prepImportWrapperScript).toReturnWith(
    expect.stringContaining('%PATH%'),
  )

  /* ------------ CONDITIONAL REPLACEMENTS ----------- */

  // %EVENTS% should NOT be replaced in implicit wrapper
  expect(prepImportWrapperScript).toReturnWith(
    expect.stringContaining('%EVENTS%'),
  )

  // %EXCLUDE% should be replaced in implicit wrapper
  expect(prepImportWrapperScript).not.toReturnWith(
    expect.stringContaining('%EXCLUDE%'),
  )
  expect(prepImportWrapperScript).toReturnWith(
    expect.stringContaining(JSON.stringify(['extension'])),
  )
})

test('returns plugin with srcDir getter', () => {
  const plugin = manifestInput()

  expect(plugin.srcDir).toBeNull()

  // Rollup config
  const options: RollupOptions = {
    input: getExtPath('kitchen-sink/manifest.json'),
  }

  plugin.options.call(context, options)

  expect(plugin.srcDir).toBe(getExtPath('kitchen-sink'))
})
