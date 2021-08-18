/* eslint-env node */

// import typescript from '@rollup/plugin-typescript'
import sucrase from '@rollup/plugin-sucrase'
import bundleImports from 'rollup-plugin-bundle-imports'
import json from '@rollup/plugin-json'

const { dependencies } = require('./package.json')

const external = Object.keys(dependencies).concat('path', 'fs')

const plugins = [
  json(),
  sucrase({
    transforms: ['typescript'],
  }),
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
