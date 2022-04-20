/* eslint-env node */

// import typescript from '@rollup/plugin-typescript'
import sucrase from '@rollup/plugin-sucrase'
import bundleImports from 'rollup-plugin-bundle-imports'
import json from '@rollup/plugin-json'

// eslint-disable-next-line @typescript-eslint/no-var-requires
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
        file: 'dist/index-esm.js',
        format: 'esm',
        sourcemap: 'inline',
      },
      {
        file: 'dist/index-cjs.js',
        format: 'cjs',
        sourcemap: 'inline',
      },
    ],
    external,
    plugins,
  },
]
