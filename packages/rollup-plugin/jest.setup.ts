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

/* ---------- DONT LET ROLLUP PLUGINS WARN --------- */

beforeAll(() => {
  // eslint-disable-next-line
  // @ts-ignore
  console._warn = console.warn
  console.warn = jest.fn()
})
