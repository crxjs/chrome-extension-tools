/* eslint-env node */

import typescript from 'rollup-plugin-typescript'
import bundleImports from 'rollup-plugin-bundle-imports'
import json from 'rollup-plugin-json'

const plugins = [
  typescript(),
  json(),
  bundleImports({
    include: ['**/*.sw.js'],
    importAs: 'path',
  }),
  bundleImports({
    include: ['**/*.code.js'],
    importAs: 'code',
  }),
]

export default [
  {
    input: 'src/index.js',
    output: [
      {
        file: 'lib/index-esm.js',
        format: 'esm',
        sourcemap: 'inline',
      },
      {
        file: 'lib/index-cjs.js',
        format: 'cjs',
        sourcemap: 'inline',
      },
    ],
    external: [
      '@bumble/manifest',
      'cheerio',
      'fs-extra',
      'is-valid-path',
      'magic-string',
      'mem',
      'path',
      'picomatch',
      'rollup-pluginutils',
      'lodash.startcase',
      'ajv',
      'ajv/lib/refs/json-schema-draft-04.json',
    ],
    plugins,
  },
  {
    input: 'src/manifest-input/dynamicImportWrapper.js',
    output: {
      file: 'lib/dynamicImportWrapper.js',
      format: 'iife',
    },
    external: ['%PATH%'],
    treeshake: false,
  },
]
