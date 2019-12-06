import { OutputBundle } from 'rollup'
import { pushReloader, PushReloaderCache } from '..'
import { context } from '../../../__fixtures__/plugin-context'
import { cloneObject } from '../../manifest-input/cloneObject'
import * as functions from '../fb-functions'

jest.mock('../fb-functions.ts', () => ({
  login: jest.fn(() => Promise.resolve('UID')),
  update: jest.fn(() => Promise.resolve()),
  reload: jest.fn(() => Promise.resolve()),
}))

// Options is not used, but needed for TS
const originalBundle: OutputBundle = require('../../../__fixtures__/extensions/basic-bundle.json')

let bundle: OutputBundle
let cache: PushReloaderCache
beforeEach(() => {
  process.env.ROLLUP_WATCH = 'true'

  context.getFileName.mockImplementation(() => 'mock-file-name')
  bundle = cloneObject(originalBundle)
  cache = { firstRun: true }
})

test('calls reload cloud function', async () => {
  const plugin = pushReloader({ cache })!

  await plugin.writeBundle.call(context, bundle)

  expect(functions.reload)
})

test('Warns if no registered clients', async () => {
  // @ts-ignore
  const reload = functions.reload as jest.MockInstance<
    Promise<void>,
    []
  >

  reload.mockImplementation(() =>
    Promise.reject(new Error('no registered clients')),
  )

  const plugin = pushReloader({ cache })!

  await plugin.writeBundle.call(context, bundle)

  expect(context.warn).toBeCalledWith(
    'Reload the extension in Chrome to start hot-reloading.',
  )
})

test('Errors if reload throws', async () => {
  // @ts-ignore
  const reload = functions.reload as jest.MockInstance<
    Promise<void>,
    []
  >

  const errorMessage = 'some error'
  reload.mockImplementation(() =>
    Promise.reject(new Error(errorMessage)),
  )

  const plugin = pushReloader({ cache })!

  try {
    await plugin.writeBundle.call(context, bundle)
  } catch (error) {
    expect(error).toEqual(new Error(errorMessage))
    expect(context.error).toBeCalledWith(errorMessage)
  }
})
