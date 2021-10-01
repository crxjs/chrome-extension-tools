import { chromeExtension, simpleReloader } from '$src'
import babel from '@rollup/plugin-babel'
import commonjs from '@rollup/plugin-commonjs'
import resolve from '@rollup/plugin-node-resolve'
import path from 'path'

export default {
  input: ['src/manifest.json'],
  output: {
    dir: 'dist',
    format: 'esm',
    chunkFileNames: 'chunks/[name]-[hash].js',
  },
  plugins: [
    chromeExtension(),
    // Adds a Chrome extension reloader during watch mode
    simpleReloader(),
    babel({
      // Do not transpile dependencies
      ignore: [path.resolve(__dirname, '../../../node_modules')],
      babelHelpers: 'bundled',
      configFile: path.resolve(__dirname, 'babel.config.json'),
    }),
    resolve({
      extensions: ['.mjs', '.js', '.json', '.node', '.jsx'],
    }),
    commonjs({
      namedExports: {
        react: Object.keys(require('react')),
        'react-dom': Object.keys(require('react-dom')),
      },
    }),
  ],
}
