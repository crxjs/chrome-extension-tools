/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { chromeExtension } from '$src'
import commonjs from '@rollup/plugin-commonjs'
import resolve from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'
import path from 'path'

export default {
  input: path.join(__dirname, `manifest.json`),
  output: {
    dir: path.join(__dirname, `dist`),
    format: 'esm',
    sourcemap: false,
  },
  plugins: [
    chromeExtension({ verbose: false }),
    typescript(),
    resolve(),
    commonjs(),
  ],
}
