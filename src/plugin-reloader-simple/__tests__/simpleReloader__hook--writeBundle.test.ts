import { join } from 'path'
import { OutputBundle } from 'rollup'
import { simpleReloader } from '..'
import { buildCRX } from '../../../__fixtures__/build-basic-crx'
import { inversePromise } from '../../../__fixtures__/inversePromise'
import { context } from '../../../__fixtures__/plugin-context'
import { getExtPath } from '../../../__fixtures__/utils'
import { cloneObject } from '../../manifest-input/cloneObject'

const fsExtra = require('fs-extra')
const mockOutputJson = jest.spyOn(fsExtra, 'outputJson')
mockOutputJson.mockImplementation(() => Promise.resolve())

const outputDir = 'outputDir'
const timestampPath = 'timestampPath'

const bundlePromise = inversePromise<OutputBundle>()
beforeAll(
  buildCRX(
    getExtPath('basic/rollup.config.js'),
    (error, result) => {
      if (error) {
        bundlePromise.reject(error)
      } else if (result) {
        bundlePromise.resolve(result.bundle)
      } else {
        bundlePromise.reject(new Error('Could not build CRX'))
      }
    },
  ),
  10000,
)

beforeEach(() => {
  process.env.ROLLUP_WATCH = 'true'
})

test('Writes timestamp file', async () => {
  const bundle = cloneObject(await bundlePromise)
  const plugin = simpleReloader(
    {},
    { outputDir, timestampPath },
  )!

  await plugin.writeBundle.call(context, bundle)

  expect(mockOutputJson).toBeCalledWith(
    join(outputDir, timestampPath),
    expect.any(Number),
  )
})

test('Handles write errors with message prop', async () => {
  const bundle = cloneObject(await bundlePromise)
  const plugin = simpleReloader(
    {},
    { outputDir, timestampPath },
  )!

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
  const bundle = cloneObject(await bundlePromise)
  const plugin = simpleReloader(
    {},
    { outputDir, timestampPath },
  )!

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
