import { InputOptions } from 'rollup'
import {
  pushReloader,
  PushReloaderCache,
  PushReloaderPlugin,
} from '..'
import { context } from '../../../__fixtures__/plugin-context'
import { getExtPath } from '../../../__fixtures__/utils'
import { firebase } from '../firebase'

jest.mock('../firebase')

jest.useFakeTimers()

const options: InputOptions = {
  input: getExtPath('basic/manifest.json'),
}

let plugin: PushReloaderPlugin
let cache: PushReloaderCache
beforeEach(async () => {
  process.env.ROLLUP_WATCH = 'true'

  jest.clearAllMocks()

  cache = { firstRun: false }
  plugin = pushReloader({ cache })!

  await plugin.buildStart.call(context, options)
})

beforeEach(() => {
  process.env.ROLLUP_WATCH = 'true'
})

test('signal clients on buildStart', () => {
  const httpsCallable = firebase.functions().httpsCallable
  const cloudFunction = httpsCallable('buildStart')
  
  expect(cloudFunction).toBeCalled()
})
