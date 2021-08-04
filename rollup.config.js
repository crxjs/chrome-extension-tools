/* eslint-env node */

// import typescript from '@rollup/plugin-typescript'
import sucrase from '@rollup/plugin-sucrase'
import bundleImports from 'rollup-plugin-bundle-imports'
import json from '@rollup/plugin-json'
import alias from '@rollup/plugin-alias'
import hq from 'alias-hq'

const { dependencies } = require('./package.json')

const external = Object.keys(dependencies).concat(
  'firebase/app',
  'firebase/auth',
  'firebase/functions',
  'path',
)

const plugins = [
  alias(hq.get('rollup', { format: 'object' })),
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
