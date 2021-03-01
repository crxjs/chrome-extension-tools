import path from 'path'

import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import alias from '@rollup/plugin-alias'
import babel from '@rollup/plugin-babel'

import { getExtPath, getCrxName } from '../../utils'

import { chromeExtension, simpleReloader } from '../../../src'

// Aliases for module resolution
const aliases = [
  {
    find: 'react',
    // Use the production build
    replacement: require.resolve(
      '@esm-bundle/react/esm/react.development.js',
    ),
  },
  {
    find: 'react-dom',
    // Use the production build
    replacement: require.resolve(
      '@esm-bundle/react-dom/esm/react-dom.development.js',
    ),
  },
]

const crxName = getCrxName(__filename)

export default {
  input: getExtPath(`${crxName}/src/manifest.json`),
  output: {
    dir: getExtPath(`${crxName}-dist`),
    format: 'esm',
    chunkFileNames: 'chunks/[name]-[hash].js',
  },
  plugins: [
    chromeExtension(),
    // Adds a Chrome extension reloader during watch mode
    simpleReloader(),
    alias({ entries: aliases }),
    babel({
      // Do not transpile dependencies
      ignore: ['node_modules'],
      babelHelpers: 'bundled',
      configFile: path.resolve(__dirname, 'babel.config.json'),
    }),
    resolve(),
    commonjs(),
  ],
}
