import { chromeExtension } from '$src'
import commonjs from '@rollup/plugin-commonjs'
import resolve from '@rollup/plugin-node-resolve'
import path from 'path'
import esbuild from 'rollup-plugin-esbuild'

export default {
  input: ['src/manifest.json'],
  output: {
    dir: 'dist',
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
