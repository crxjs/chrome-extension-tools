/* eslint-env jest */

import 'array-flat-polyfill'
import { join } from 'path'
import './test/helpers/inspect'
import { jestSetTimeout } from './test/helpers/timeout'

jestSetTimeout(5000)

// For testing package detection
process.chdir(join(__dirname, 'test'))

// Jest attempts to sandbox globals, but it doesn't work with `instanceof`
// https://github.com/facebook/jest/issues/2549
// Object.defineProperty(Uint8Array, Symbol.hasInstance, {
//   value(target: any) {
//     return ['Uint8Array', 'Buffer'].includes(
//       target.constructor.name,
//     )
//   },
//   writable: true,
// })

// TODO: do we still need this?
if (process.env.npm_config_argv) {
  process.env.JEST_WATCH = JSON.parse(
    process.env.npm_config_argv,
  ).original.includes('--watch')
}

jest.spyOn(console, 'log')
jest.spyOn(console, 'error')
jest.spyOn(console, 'warn').mockImplementation()
