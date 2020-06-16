import { outputJson } from 'fs-extra'
import { join } from 'path'
import { OutputBundle } from 'rollup'
import {
  simpleReloader,
  SimpleReloaderPlugin,
  _internalCache,
} from '..'
import { context } from '../../../__fixtures__/plugin-context'
import { cloneObject } from '../../manifest-input/cloneObject'

jest.mock('fs-extra', () => ({
  outputJson: jest.fn(() => Promise.resolve()),
}))

const mockOutputJson = outputJson as jest.MockedFunction<
  typeof outputJson
>

const outputDir = 'outputDir'
const timestampPath = 'timestampPath'

const originalBundle: OutputBundle = require('../../../__fixtures__/extensions/basic-bundle.json')

let bundle: OutputBundle
let plugin: SimpleReloaderPlugin
beforeEach(() => {
  process.env.ROLLUP_WATCH = 'true'

  bundle = cloneObject(originalBundle)
  plugin = simpleReloader({ outputDir, timestampPath })!
})

test('Writes timestamp file', async () => {
  await plugin.writeBundle.call(context, bundle)

  expect(mockOutputJson).toBeCalledWith(
    join(outputDir, timestampPath),
    expect.any(Number),
  )
})

test('Handles write errors with message prop', async () => {
  const message = 'ERROR!'

  mockOutputJson.mockImplementation(() =>
    Promise.reject({ message }),
  )

  // @ts-ignore
  context.error.mockImplementationOnce(() => {})

  await plugin.writeBundle.call(context, bundle)

  expect(context.error).toBeCalledWith(
    expect.stringContaining(message),
  )
})

test('Handles other write errors', async () => {
  const message = 'ERROR!'

  mockOutputJson.mockImplementation(() =>
    Promise.reject(message),
  )

  // @ts-ignore
  context.error.mockImplementationOnce(() => {})

  await plugin.writeBundle.call(context, bundle)

  expect(context.error).toBeCalledWith(
    expect.stringContaining('Unable to update timestamp file'),
  )
})
