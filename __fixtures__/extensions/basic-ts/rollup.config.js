import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import typescript from '@rollup/plugin-typescript'
import alias from '@rollup/plugin-alias'

import { getExtPath, getCrxName } from '../../utils'

import { chromeExtension, simpleReloader } from '../../../src'

// Aliases for module resolution
const aliases = [
  {
    find: 'react',
    // Use the production build
    replacement: require.resolve(
      '@esm-bundle/react/esm/react.production.min.js',
    ),
  },
  {
    find: 'react-dom',
    // Use the production build
    replacement: require.resolve(
      '@esm-bundle/react-dom/esm/react-dom.production.min.js',
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
    sourcemap: 'inline',
  },
  plugins: [
    chromeExtension(),
    // Adds a Chrome extension reloader during watch mode
    simpleReloader(),
    alias({ entries: aliases }),
    resolve(),
    commonjs(),
    typescript(),
  ],
}
