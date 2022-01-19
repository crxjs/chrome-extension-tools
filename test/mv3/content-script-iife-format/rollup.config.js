import { chromeExtension } from '$src'
import esbuild from 'rollup-plugin-esbuild'
import commonjs from '@rollup/plugin-commonjs'
import resolve from '@rollup/plugin-node-resolve'
import path from 'path'

export default {
  input: [path.join(__dirname, 'src', 'manifest.json')],
  output: {
    dir: path.join(__dirname, 'dist'),
    format: 'esm',
    chunkFileNames: 'chunks/[name]-[hash].js',
  },
  plugins: [
    chromeExtension({
      contentScriptFormat: 'iife',
    }),
    esbuild(),
    resolve({
      extensions: ['.mjs', '.js', '.json', '.node', '.jsx'],
    }),
    commonjs(),
  ],
}
