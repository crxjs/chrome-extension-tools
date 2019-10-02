/* eslint-env node */

import typescript from 'rollup-plugin-typescript'
import bundleImports from 'rollup-plugin-bundle-imports'

const plugins = [
  typescript(),
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
