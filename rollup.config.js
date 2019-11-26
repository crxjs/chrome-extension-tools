/* eslint-env node */

import typescript from 'rollup-plugin-typescript'
import bundleImports from 'rollup-plugin-bundle-imports'
import json from 'rollup-plugin-json'

const plugins = [
  typescript(),
  json(),
  bundleImports({
    useVirtualModule: true,
    options: {
      external: ['%PATH%'],
    },
  }),
]

export default [
  {
    input: 'src/index.ts',
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
      'ajv',
      'ajv/lib/refs/json-schema-draft-04.json',
      'cheerio',
      'cosmiconfig',
      'fs-extra',
      'fs',
      'glob',
      'is-valid-path',
      'lodash.flatten',
      'lodash.get',
      'lodash.startcase',
      'magic-string',
      'mem',
      'path',
      'picomatch',
      'rollup-pluginutils',
      'slash',
    ],
    plugins,
  },
]
