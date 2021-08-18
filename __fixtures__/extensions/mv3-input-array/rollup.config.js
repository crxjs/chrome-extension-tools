/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { basename } from 'path'
import { chromeExtension } from '../../../src/index'
import { getExtPath } from '../../utils'

const crxName = basename(__dirname)
export default {
  input: [
    getExtPath(crxName, 'manifest.json'),
    getExtPath(crxName, 'index.html'),
  ],
  output: {
    dir: getExtPath(crxName, 'dist'),
    format: 'esm',
  },
  plugins: [chromeExtension({ verbose: false })],
}
