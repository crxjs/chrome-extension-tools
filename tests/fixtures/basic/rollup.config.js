/* eslint-env node */

import plugin from '../../../src/index'
// import { hooksInOrder } from '../../../examples/rollup-hook-order'

export default {
  input: 'tests/fixtures/basic/manifest.json',
  output: {
    dir: 'tests/fixtures/dest',
    format: 'esm',
  },
  plugins: [
    plugin(),
    //  hooksInOrder()
  ],
}
