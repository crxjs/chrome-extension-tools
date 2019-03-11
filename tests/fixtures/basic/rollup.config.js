/* eslint-env node */

import plugin from '../../../src/index'
import { hooksInOrder } from '../../../examples/rollup-hook-order'

export default {
  input: 'tests/fixtures/basic/background.js',
  output: {
    dir: 'tests/fixtures/dest',
    format: 'iife',
  },
  plugins: [plugin(), hooksInOrder()],
}
