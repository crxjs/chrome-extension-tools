/* eslint-env node */

import bundleImports from 'rollup-plugin-bundle-imports'

import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'

const plugins = [
  bundleImports({
    include: ['**/*.sw.js'],
    importAs: 'path',
    options: { plugins: [resolve(), commonjs()] },
  }),
  bundleImports({
    include: ['**/*.code.js'],
    importAs: 'code',
    options: { plugins: [resolve(), commonjs()] },
  }),
]

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
      '@firebase/app',
      '@firebase/auth',
      '@firebase/functions',
      'cheerio',
      'cors',
      'debounce',
      'express',
      'fs-extra',
      'http',
      'is-valid-path',
      'magic-string',
      'mem',
      'path',
      'picomatch',
      'rollup-plugin-zip',
      'rollup-pluginutils',
      'socket.io',
    ],
    plugins,
  },
]
