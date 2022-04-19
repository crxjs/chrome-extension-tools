import commonjs from '@rollup/plugin-commonjs'
import resolve from '@rollup/plugin-node-resolve'
import { basename } from 'path'
import { chromeExtension } from '../../../src/index'
import { getExtPath } from '../../utils'

const crxName = basename(__dirname)
export default {
  input: getExtPath(crxName, 'manifest.json'),
  output: {
    dir: getExtPath(crxName, 'dist'),
    format: 'esm',
  },
  plugins: [
    chromeExtension({
      verbose: false,
      contentScriptWrapper: false,
      dynamicImportWrapper: false,
      iifeJsonPaths: ['$.background.scripts[*]', '$.content_scripts[*].js'],
    }),
    resolve(),
    commonjs(),
  ],
}
