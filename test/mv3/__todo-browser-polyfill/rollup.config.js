import { chromeExtension } from '$src'
import commonjs from '@rollup/plugin-commonjs'
import resolve from '@rollup/plugin-node-resolve'
import esbuild from 'rollup-plugin-esbuild'
import path from 'path'

export default {
  input: path.join(__dirname, 'manifest.json'),
  output: {
    dir: path.join(__dirname),
    format: 'esm',
  },
  plugins: [
    chromeExtension({ verbose: false, browserPolyfill: true }),
    esbuild(),
    resolve(),
    commonjs(),
  ],
}
