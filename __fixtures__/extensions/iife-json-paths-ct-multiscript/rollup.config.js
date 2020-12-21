import { basename } from 'path'
import commonjs from '@rollup/plugin-commonjs'
import resolve from '@rollup/plugin-node-resolve'
import { chromeExtension } from '../../../src/index'
import { getExtPath } from '../../utils'

export default {
  input: getExtPath(basename(__dirname) + '/manifest.json'),
  output: {
    dir: getExtPath(basename(__dirname) + '-dist'),
    format: 'esm',
  },
  plugins: [
    chromeExtension({
      verbose: false,
      contentScriptWrapper: false,
      dynamicImportWrapper: false,
      iifeJsonPaths: ['$.content_scripts[*].js'],
    }),
    resolve(),
    commonjs(),
  ],
}
