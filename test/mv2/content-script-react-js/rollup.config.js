import { chromeExtension } from '$src'
import commonjs from '@rollup/plugin-commonjs'
import resolve from '@rollup/plugin-node-resolve'
import path from 'path'
import esbuild from 'rollup-plugin-esbuild'

export default {
  input: [path.join(__dirname, 'src', 'manifest.json')],
  output: {
    dir: path.join(__dirname, 'dist'),
    format: 'esm',
    chunkFileNames: 'chunks/[name]-[hash].js',
  },
  plugins: [chromeExtension(), esbuild(), resolve(), commonjs()],
}
