/* eslint-env node */

// import typescript from '@rollup/plugin-typescript'
import json from '@rollup/plugin-json'
import sucrase from '@rollup/plugin-sucrase'
import fs from 'fs-extra'
import path from 'path'
import bundleImports from 'rollup-plugin-bundle-imports'

const { dependencies } = fs.readJsonSync(
  path.join(process.cwd(), 'package.json'),
)

const external = Object.keys(dependencies).concat(
  'fs',
  'path',
  'rollup',
  'xstate/lib/actions',
  'xstate/lib/model',
)

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
