import fs from 'fs-extra'
import { allFilesReady, crx } from 'src/.'
import { _debug } from 'src/helpers'
import { join } from 'src/path'
import type { CrxPlugin } from 'src/types'
import {
  build as _build,
  createServer,
  InlineConfig,
  ResolvedConfig,
} from 'vite'
import inspect from 'vite-plugin-inspect'

export async function build(dirname: string, configFile = 'vite.config.ts') {
  const debug = _debug('test:build')
  debug('start %s', dirname)

  const cacheDir = join(dirname, '.vite')
  const outDir = join(dirname, 'dist-build')

  process.chdir(dirname)
  await fs.remove(cacheDir)
  await fs.remove(outDir)

  let config: ResolvedConfig
  const inlineConfig: InlineConfig = {
    configFile: join(dirname, configFile),
    envFile: false,
    build: {
      outDir,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) return 'vendor'
          },
        },
      },
    },
    cacheDir,
    plugins: [
      // @ts-expect-error we're going to override this from the vite config
      crx(null),
      {
        name: 'test:get-config',
        configResolved(_config) {
          config = _config
        },
      },
    ],
    clearScreen: false,
    logLevel: 'error',
  }
  const output = await _build(inlineConfig)

  if (Array.isArray(output))
    throw new TypeError('received outputarray from vite build')
  if ('close' in output) throw new TypeError('recieved watcher from vite build')

  return { outDir, output, config: config! }
}

export async function serve(dirname: string) {
  const debug = _debug('test:serve')
  debug('start %s', dirname)

  const cacheDir = join(dirname, '.vite')
  const outDir = join(dirname, 'dist-serve')

  process.chdir(dirname)
  await fs.remove(cacheDir)
  await fs.remove(outDir)
  debug('clean dirs')

  const plugins: CrxPlugin[] = [
    // @ts-expect-error we're going to override this from the vite config
    crx(null),
  ]
  if (process.env.DEBUG) plugins.push(inspect())

  const inlineConfig: InlineConfig = {
    configFile: join(dirname, 'vite.config.ts'),
    envFile: false,
    build: { outDir, minify: false },
    cacheDir,
    plugins,
    clearScreen: false,
    logLevel: 'error',
    server: {
      watch: {
        // cache dir should not trigger update in these tests
        ignored: [cacheDir],
      },
    },
  }
  const server = await createServer(inlineConfig)
  debug('create server')

  await server.listen()
  // @ts-expect-error Need to wait for dynamic scripts to finish
  await server._optimizedDeps?.scanProcessing

  debug('listen')
  await allFilesReady()
  debug('bundle end')

  return { outDir, server, config: server.config }
}

export const isTextFile = (x: string) =>
  ['.html', '.css', '.js'].some((y) => x.endsWith(y))
export const defaultTest = (source: string, name: string) => {
  expect(source).toMatchSnapshot(name)
}
