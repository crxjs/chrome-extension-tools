/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { basename } from 'path'
import { chromeExtension } from '../../../src/index'
import { getExtPath } from '../../utils'

const crxName = basename(__dirname)
export default {
  input: {
    manifest: getExtPath(crxName, 'manifest.json'),
    index: getExtPath(crxName, 'index.html'),
  },
  output: {
    dir: getExtPath(crxName, 'dist'),
    format: 'esm',
  },
  plugins: [chromeExtension({ verbose: false })],
}
