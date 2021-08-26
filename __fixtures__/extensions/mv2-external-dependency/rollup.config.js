import { basename } from 'path'
import commonjs from '@rollup/plugin-commonjs'
import resolve from '@rollup/plugin-node-resolve'
import { chromeExtension } from '../../../src/index'
import { getExtPath } from '../../utils'

const crxName = basename(__dirname)

export default {
  input: getExtPath(crxName, 'manifest.json'),
  output: {
    dir: getExtPath(crxName, 'dist'),
    format: 'esm',
    chunkFileNames: 'chunks/[name]-[hash].js',
  },
  plugins: [
    chromeExtension({ verbose: false }),
    resolve(),
    commonjs(),
  ],
  external: ['path'],
}
