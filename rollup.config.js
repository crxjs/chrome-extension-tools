/* eslint-env node */

// import resolve from 'rollup-plugin-node-resolve'
// import commonjs from 'rollup-plugin-commonjs'
import code from 'rollup-plugin-code-string'
// import json from 'rollup-plugin-json'

export default [
  {
    input: 'src/index.js',
    output: [
      {
        file: 'build/bundle-esm.js',
        format: 'esm',
        sourcemap: 'inline',
      },
      {
        file: 'build/bundle-cjs.js',
        format: 'cjs',
        sourcemap: 'inline',
      },
    ],
    external: [
      '@bumble/manifest',
      'cheerio',
      'cors',
      'debounce',
      'express',
      'fs-extra',
      'http',
      'magic-string',
      'path',
      'rollup-plugin-zip',
      'rollup-pluginutils',
      'socket.io',
      'picomatch',
      'is-valid-path',
      'mem',
    ],
    plugins: [code()],
  },
]
