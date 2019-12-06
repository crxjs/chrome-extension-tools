/* eslint-env jest */

import 'array-flat-polyfill'

if (process.env.npm_config_argv) {
  process.env.JEST_WATCH = JSON.parse(
    process.env.npm_config_argv,
  ).original.includes('--watch')
}

jest.spyOn(console, 'log')
jest.spyOn(console, 'error')
jest.spyOn(console, 'warn')
