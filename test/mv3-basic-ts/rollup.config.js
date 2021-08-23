import commonjs from '@rollup/plugin-commonjs'
import resolve from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'
import { chromeExtension, simpleReloader } from '../../../src'

export default {
  input: path.join(__dirname, 'src', 'manifest.json'),
  output: {
    dir: path.join(__dirname, 'dist'),
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
