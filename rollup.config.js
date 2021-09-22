/* eslint-env node */

// import typescript from '@rollup/plugin-typescript'
import json from '@rollup/plugin-json'
import sucrase from '@rollup/plugin-sucrase'
import alias from '@rollup/plugin-alias'
import fs from 'fs-extra'
import path from 'path'
import bundleImports from 'rollup-plugin-bundle-imports'

const { dependencies, peerDependencies = {} } = fs.readJsonSync(
  path.join(process.cwd(), 'package.json'),
)

const external = Object.keys({
  ...dependencies,
  ...peerDependencies,
}).concat('fs', 'path', 'xstate/lib/actions', 'xstate/lib/model')

const plugins = [
  alias({
    entries: [
      {
        find: /^\$src\/(.*)/,
        replacement: path.resolve(__dirname, 'src/$1'),
      },
      {
        find: '$src',
        replacement: path.resolve(__dirname, 'src', 'index.ts'),
      },
    ],
  }),
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
