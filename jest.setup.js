/* eslint-env jest */

import 'array-flat-polyfill'

process.env.JEST_WATCH = JSON.parse(
  process.env.npm_config_argv,
).original.includes('--watch')
