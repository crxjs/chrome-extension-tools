import alias from '@rollup/plugin-alias'
import commonjs from '@rollup/plugin-commonjs'
import resolve from '@rollup/plugin-node-resolve'
import _debug from 'debug'
import fs from 'fs-extra'
import jsesc from 'jsesc'
import { posix as path } from 'path'
import { defineConfig, Plugin, rollup, RollupOptions } from 'rollup'
import esbuild from 'rollup-plugin-esbuild'

const debug = _debug('config:rollup')

const { dependencies, peerDependencies = {} } = fs.readJsonSync(
  path.join(process.cwd(), 'package.json'),
)

const external: (string | RegExp)[] = [
  ...Object.keys({
    ...dependencies,
    ...peerDependencies,
  }),
  'v8',
  'fs',
  'path',
  /%PORT%/,
  /%PATH%/,
]
debug('external %O')

const bundleClientCode = (): Plugin => {
  let options: RollupOptions
  return {
    name: 'bundleClientCode',
    options(_options) {
      options = _options
      debug('options %O', options)
      return null
    },
    resolveId(source, importer) {
      if (importer && source.includes('?client')) return source
    },
    async load(id) {
      if (id.includes('?client')) {
        const url = new URL(id, 'stub://stub')
        const filepath = url.pathname
        const format = path.dirname(filepath).split('/').pop() as
          | 'es'
          | 'iife'
          | 'html'

        let result: string
        if (format === 'html') {
          result = await fs.readFile(filepath, { encoding: 'utf8' })
        } else {
          const build = await rollup({
            ...options,
            input: filepath,
          })

          const { output } = await build.generate({ format })
          result = output[0].code
        }

        this.addWatchFile(filepath)

        return `export default "${jsesc(result, { quotes: 'double' })}"`
      }
    },
  }
}

const config = defineConfig({
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
    bundleClientCode(),
    resolve(),
    commonjs(),
    esbuild({ legalComments: 'inline' }),
  ],
})

export default config
