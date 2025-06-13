import { watch } from 'chokidar'
import fs from 'fs-extra'
import { join } from 'pathe'
import { RollupOutput } from 'rollup'
import {
  delay,
  firstValueFrom,
  fromEvent,
  map,
  of,
  startWith,
  switchMap,
} from 'rxjs'
import { allFilesReady, crx } from 'src/.'
import { _debug } from 'src/helpers'
import type { CrxPlugin } from 'src/types'
import {
  build as _build,
  createServer,
  InlineConfig,
  ResolvedConfig,
  ViteDevServer,
} from 'vite'
import inspect from 'vite-plugin-inspect'
import { expect } from 'vitest'

export interface BuildTestResult {
  command: 'build'
  config: ResolvedConfig
  output: RollupOutput
  outDir: string
  rootDir: string
}
export interface ServeTestResult {
  command: 'serve'
  config: ResolvedConfig
  server: ViteDevServer
  outDir: string
  rootDir: string
}

export async function build(
  dirname: string,
  configFile = 'vite.config.ts',
): Promise<BuildTestResult> {
  const debug = _debug('test:build')
  debug('start %s', dirname)

  const cacheDir = join(dirname, '.vite')
  const outDir = join(dirname, 'dist-build')

  await fs.remove(cacheDir)
  await fs.remove(outDir)

  const plugins: CrxPlugin[] = [
      // @ts-expect-error we're going to override this from the vite config
      crx(null),
      {
        name: 'test:get-config',
        configResolved(_config) {
          config = _config;
        },
      },
  ];

  if (process.env.DEBUG) {
    plugins.push(inspect({
      build: true,
      outputDir: '.vite-inspect'
    }));
  }


  let config: ResolvedConfig
  const inlineConfig: InlineConfig = {
    root: dirname,
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
    plugins,
    clearScreen: false,
    logLevel: 'error',
  }
  const output = await _build(inlineConfig)

  if (Array.isArray(output))
    throw new TypeError('received outputarray from vite build')
  if ('close' in output) throw new TypeError('received watcher from vite build')

  return { command: 'build', outDir, output, config: config!, rootDir: dirname }
}

export async function serve(dirname: string): Promise<ServeTestResult> {
  const debug = _debug('test:serve')
  debug('start %s', dirname)

  const cacheDir = join(dirname, '.vite')
  const outDir = join(dirname, 'dist-serve')

  await fs.remove(cacheDir)
  await fs.remove(outDir)
  debug('clean dirs')

  const plugins: CrxPlugin[] = [
    // @ts-expect-error we're going to override this from the vite config
    crx(null),
  ]
  if (process.env.DEBUG) plugins.push(inspect())

  const minPort = 5200
  const maxPort = 5500
  const randomPort =
    Math.floor(Math.random() * (maxPort - minPort + 1)) + minPort

  const inlineConfig: InlineConfig = {
    root: dirname,
    configFile: join(dirname, 'vite.config.ts'),
    envFile: false,
    build: { outDir, minify: false },
    cacheDir,
    plugins,
    clearScreen: false,
    logLevel: 'error',
    server: {
      port: randomPort,
      strictPort: true,
      hmr: {
        port: randomPort,
      },
      watch: {
        // cache dir should not trigger update in these tests
        ignored: [cacheDir],
        // During tests we edit the files too fast and sometimes chokidar
        // misses change events, so enforce polling for consistency
        usePolling: true,
        interval: 100,
      },
    },
  }
  const server = await createServer(inlineConfig)
  debug('create server')

  await server.listen()

  debug('listen')
  await allFilesReady()
  debug('bundle end')

  const outDirSettle$ = fromEvent(watch(outDir), 'all').pipe(
    startWith(null),
    map((x, i) => i),
    // debounce relies on the Date object
    switchMap((i) => of(i).pipe(delay(500))),
  )

  // watch for activity on outDir to settle, Vite may be pre-bundling
  await firstValueFrom(outDirSettle$)

  return {
    command: 'serve',
    outDir,
    server,
    config: server.config,
    rootDir: dirname,
  }
}

export const isTextFile = (x: string) =>
  ['.html', '.css', '.js'].some((y) => x.endsWith(y))
export const defaultTest = (source: string, name: string) => {
  expect(source).toMatchSnapshot(name)
}
