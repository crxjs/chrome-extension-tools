import path from 'path'

import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import babel from '@rollup/plugin-babel'

import { getExtPath, getCrxName } from '../../utils'

import { chromeExtension, simpleReloader } from '../../../src'

const crxName = getCrxName(__filename)

export default {
  input: getExtPath(crxName, 'src', 'manifest.json'),
  output: {
    dir: getExtPath(crxName, 'dist'),
    format: 'esm',
    chunkFileNames: 'chunks/[name]-[hash].js',
  },
  plugins: [
    chromeExtension(),
    // Adds a Chrome extension reloader during watch mode
    simpleReloader(),
    babel({
      // Do not transpile dependencies
      ignore: ['node_modules'],
      babelHelpers: 'bundled',
      configFile: path.resolve(__dirname, 'babel.config.json'),
    }),
    resolve(),
    commonjs({
      namedExports: {
        react: Object.keys(require('react')),
        'react-dom': Object.keys(require('react-dom')),
      },
    }),
  ],
}
