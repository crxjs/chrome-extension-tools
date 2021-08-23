import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import typescript from '@rollup/plugin-typescript'

import { getExtPath, getCrxName } from '../../utils'

import { chromeExtension, simpleReloader } from '../../../src'

const crxName = getCrxName(__filename)

export default {
  input: {
    manifest: getExtPath(crxName, 'src', 'manifest.ts'),
    script: getExtPath(crxName, 'src', 'script.ts'),
  },
  output: {
    dir: getExtPath(crxName, 'dist'),
    format: 'esm',
    chunkFileNames: 'chunks/[name]-[hash].js',
    sourcemap: 'inline',
  },
  plugins: [
    chromeExtension(),
    // Adds a Chrome extension reloader during watch mode
    simpleReloader(),
    resolve(),
    commonjs({
      namedExports: {
        react: Object.keys(require('react')),
        'react-dom': Object.keys(require('react-dom')),
      },
    }),
    typescript(),
  ],
}
