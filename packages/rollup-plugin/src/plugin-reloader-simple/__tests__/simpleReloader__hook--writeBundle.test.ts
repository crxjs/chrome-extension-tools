import { join } from 'path'
import { simpleReloader } from '..'
import { buildCRX } from '../../../__fixtures__/build-crx'
import { context } from '../../../__fixtures__/plugin-context'
import { cloneObject } from '../../manifest-input/cloneObject'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const fsExtra = require('fs-extra')
const mockOutputJson = jest.spyOn(fsExtra, 'outputJson')
mockOutputJson.mockImplementation(() => Promise.resolve())

const outputDir = 'outputDir'
const timestampPath = 'timestampPath'

const buildPromise = buildCRX()

beforeAll(jest.useFakeTimers)
afterEach(jest.clearAllMocks)

beforeEach(() => {
  process.env.ROLLUP_WATCH = 'true'
})

test('Writes timestamp file', async () => {
  const { bundle } = cloneObject(await buildPromise)
  const plugin = simpleReloader(
    { reloadDelay: 0 },
    { outputDir, timestampPath },
  )!

  await plugin.writeBundle.call(context, bundle)

  expect(mockOutputJson).toBeCalledWith(
    join(outputDir, timestampPath),
    expect.any(Number),
  )
})

test('Delays prescribed amount', async () => {
  const { bundle } = cloneObject(await buildPromise)
  const plugin = simpleReloader(
    { reloadDelay: 100 },
    { outputDir, timestampPath },
  )!

  const promise = plugin.writeBundle.call(context, bundle)

  expect(mockOutputJson).not.toBeCalled()

  jest.advanceTimersToNextTimer()

  await promise

  expect(mockOutputJson).toBeCalledWith(
    join(outputDir, timestampPath),
    expect.any(Number),
  )
})

test('Handles write errors with message prop', async () => {
  const { bundle } = cloneObject(await buildPromise)
  const plugin = simpleReloader(
    { reloadDelay: 0 },
    { outputDir, timestampPath },
  )!

  const message = 'ERROR!'

  mockOutputJson.mockImplementation(() => Promise.reject({ message }))

  // @ts-expect-error We don't actually want to throw in the test
  context.error.mockImplementationOnce(() => {})

  await plugin.writeBundle.call(context, bundle)

  expect(context.error).toBeCalledWith(expect.stringContaining(message))
})

test('Handles other write errors', async () => {
  const { bundle } = cloneObject(await buildPromise)
  const plugin = simpleReloader(
    { reloadDelay: 0 },
    { outputDir, timestampPath },
  )!

  const message = 'ERROR!'

  mockOutputJson.mockImplementation(() => Promise.reject(message))

  // @ts-expect-error We don't actually want to throw in the test
  context.error.mockImplementationOnce(() => {})

  await plugin.writeBundle.call(context, bundle)

  expect(context.error).toBeCalledWith(
    expect.stringContaining('Unable to update timestamp file'),
  )
})
