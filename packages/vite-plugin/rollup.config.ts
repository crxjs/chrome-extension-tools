import alias from '@rollup/plugin-alias'
import commonjs from '@rollup/plugin-commonjs'
import resolve from '@rollup/plugin-node-resolve'
import json from '@rollup/plugin-json'
import _debug from 'debug'
import fs from 'fs-extra'
import jsesc from 'jsesc'
import { posix as path } from 'path'
import { defineConfig, Plugin, rollup, RollupOptions } from 'rollup'
import esbuild from 'rollup-plugin-esbuild'
import dts from 'rollup-plugin-dts'

const debug = _debug('config:rollup')

const { dependencies, devDependencies } = fs.readJsonSync(
  path.join(process.cwd(), 'package.json'),
)

const external: (string | RegExp)[] = [
  ...Object.keys({
    ...dependencies,
    ...devDependencies,
  }),
  'v8',
  'fs',
  'fs/promises',
  'path',
  'node:module',
  'node:fs',
  'node:path',

  /%PORT%/,
  /%PATH%/,
]
debug('external %O', external)

const bundleClientCode = (): Plugin => {
  let options: RollupOptions
  const PREFIX = '\0client/'
  return {
    name: 'bundleClientCode',
    options(_options) {
      options = _options
      debug('options %O', options)
      return null
    },
    async resolveId(source, importer) {
      if (source.startsWith('client/')) {
        const id = await this.resolve(source, importer, { skipSelf: true })
        return id && PREFIX + id.id
      }
    },
    async load(_id) {
      if (_id.startsWith(PREFIX)) {
        const input = _id.slice(PREFIX.length)
        const format = path.dirname(input).split('/').pop() as
          | 'es'
          | 'iife'
          | 'html'

        let result: string
        if (format === 'html') {
          result = await fs.readFile(input, { encoding: 'utf8' })
        } else {
          const build = await rollup({ ...options, input })
          const { output } = await build.generate({ format })
          result = output[0].code
        }

        this.addWatchFile(input)

        return `export default "${jsesc(result, { quotes: 'double' })}"`
      }
    },
  }
}

const config = defineConfig([
  {
    external,
    input: 'src/node/index.ts',
    output: [
      {
        file: 'dist/index.mjs',
        format: 'esm',
      },
      {
        file: 'dist/index.cjs',
        format: 'cjs',
      },
    ],
    plugins: [
      bundleClientCode(),
      alias({
        entries: [
          {
            find: /^src\/(.*)/,
            replacement: path.resolve(__dirname, 'src/node/$1'),
          },
          {
            find: /^client\/(.*)/,
            replacement: path.resolve(__dirname, 'src/client/$1'),
          },
          {
            find: /^tests\/(.*)/,
            replacement: path.resolve(__dirname, 'tests/$1'),
          },
        ],
      }),
      json(),
      resolve(),
      commonjs(),
      esbuild({ legalComments: 'inline' }),
    ],
  },
  {
    input: 'src/node/index.ts',
    output: { file: 'dist/index.d.ts', format: 'es' },
    plugins: [dts()],
  },
])

export default config
