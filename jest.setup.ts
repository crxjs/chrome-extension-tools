/* eslint-env jest */

import 'array-flat-polyfill'

// nothing should timeout during debug
const timeout = process.env.JEST_TIMEOUT
  ? parseInt(process.env.JEST_TIMEOUT)
  : false
if (timeout) jest.setTimeout(timeout)

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

if (process.env.npm_config_argv) {
  process.env.JEST_WATCH = JSON.parse(
    process.env.npm_config_argv,
  ).original.includes('--watch')
}

jest.spyOn(console, 'log').mockImplementation()
jest.spyOn(console, 'error')
jest.spyOn(console, 'warn').mockImplementation()
