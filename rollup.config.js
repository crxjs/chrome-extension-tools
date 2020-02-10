/* eslint-env node */

import typescript from '@rollup/plugin-typescript'
import bundleImports from 'rollup-plugin-bundle-imports'
import json from '@rollup/plugin-json'

const { dependencies } = require('./package.json')

const external = Object.keys(dependencies).concat(
  'firebase/app',
  'firebase/auth',
  'firebase/functions',
  'path'
)

const {
  compilerOptions,
} = require('./tsconfigs/tsconfig-base.json')

const plugins = [
  typescript(compilerOptions),
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
    external,
    plugins,
  },
]
