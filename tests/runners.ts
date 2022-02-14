import fg from 'fast-glob'
import fs from 'fs-extra'
import { RollupOutput } from 'rollup'
import { allFiles, _debug } from 'src/helpers'
import type { ManifestV3 } from 'src/manifest'
import * as path from 'src/path'
import { filesReady } from 'src/plugin-fileWriter'
import type { CrxPlugin } from 'src/types'
import {
  build as _build,
  createServer,
  ResolvedConfig,
  ViteDevServer,
} from 'vite'
import inspect from 'vite-plugin-inspect'

export async function build(dirname: string) {
  const debug = _debug('test:build')
  debug('start %s', dirname)

  const cacheDir = path.join(dirname, '.vite')
  const outDir = path.join(dirname, 'dist-build')

  process.chdir(dirname)
  await fs.remove(cacheDir)
  await fs.remove(outDir)

  let config: ResolvedConfig | undefined
  const output = await _build({
    configFile: path.join(dirname, 'vite.config.ts'),
    envFile: false,
    build: { outDir },
    cacheDir,
    plugins: [
      {
        name: 'test:get-config',
        configResolved(_config) {
          config = _config
        },
      },
    ],
    clearScreen: false,
    logLevel: 'error',
  })

  if (Array.isArray(output))
    throw new TypeError('received outputarray from vite build')
  if ('close' in output) throw new TypeError('recieved watcher from vite build')

  return { outDir, output, config: config! }
}

export async function serve(dirname: string) {
  const debug = _debug('test:serve')
  debug('start %s', dirname)

  const cacheDir = path.join(dirname, '.vite')
  const outDir = path.join(dirname, 'dist-serve')

  process.chdir(dirname)
  await fs.remove(cacheDir)
  await fs.remove(outDir)
  debug('clean dirs')

  const plugins: CrxPlugin[] = []
  if (process.env.DEBUG) plugins.push(inspect())

  const devServer = await createServer({
    configFile: path.join(dirname, 'vite.config.ts'),
    envFile: false,
    build: { outDir, minify: false },
    cacheDir,
    server: {
      watch: {
        ignored: ['**/node_modules/**', '**/.git/**', cacheDir, outDir],
      },
    },
    plugins,
    clearScreen: false,
    logLevel: 'error',
  })
  debug('create server')

  await devServer.listen()
  debug('listen')
  await filesReady()
  debug('bundle end')

  return { outDir, devServer, config: devServer.config! }
}

const isVendorFile = (x: string) => /vendor\..{8}\.js$/.test(x)
const isTextFile = (x: string) =>
  ['.html', '.css', '.js'].some((y) => x.endsWith(y))
const defaultTest = (source: string, name: string) => {
  expect(source).toMatchSnapshot(name)
}

export async function testOutput(
  {
    outDir,
    devServer,
  }: { outDir: string; devServer?: ViteDevServer; output?: RollupOutput },
  tests: Map<
    string | RegExp,
    (source: string, name: string) => void
  > = new Map(),
) {
  const debug = _debug('test:output')
  debug('start %s', outDir)

  const getTest = (x: string, d = defaultTest): typeof defaultTest => {
    const t = [...tests].find(([k]) =>
      typeof k === 'string' ? k === x : k.test(x),
    )
    return t?.[1] ?? d
  }

  expect(fs.existsSync(outDir)).toBe(true)

  const manifestPath = path.join(outDir, 'manifest.json')
  const manifest: ManifestV3 = await fs.readJson(manifestPath)

  // stub vendor chunk file name (hash is not stable)
  for (const x of manifest.web_accessible_resources ?? []) {
    x.resources = x.resources
      .map((x) => (isVendorFile(x) ? 'vendor chunk' : x))
      .sort()
  }

  getTest('manifest.json', (source, name) => {
    const manifest: ManifestV3 = JSON.parse(source)
    expect(manifest).toMatchSnapshot(name)
  })(JSON.stringify(manifest), '00 manifest.json')

  let vendor = ''
  const files: string[] = []
  for (const f of await fg(`**/*`, { cwd: outDir })) {
    if (isVendorFile(f)) {
      const { base, dir } = path.parse(f)
      vendor = base
      files.push(path.join(dir, 'vendor.js'))
    } else {
      files.push(f)
    }
  }

  expect(files.sort()).toMatchSnapshot('01 output files')

  for (const file of files) {
    if (file.endsWith('vendor.js')) continue
    if (isTextFile(file)) {
      const filename = path.join(outDir, file)
      let source = await fs.readFile(filename, { encoding: 'utf8' })
      if (devServer)
        source = source
          .replace(/localhost:\d{4}/g, `localhost:3000`)
          .replace(/url\.port = "\d{4}"/, `url.port = "3000"`)
      if (vendor) source = source.replace(vendor, 'vendor.js')
      getTest(file)(source, file)
    }
  }

  /* ------------ CHECK FOR MISSING FILES ------------ */

  const missingFiles = Object.values(await allFiles(manifest, { cwd: outDir }))
    .flat()
    .sort()
    .filter((f) => !files.includes(f))

  // files in manifest not in outDir
  expect(missingFiles).toEqual([])

  if (manifest.default_locale) {
    // the default _locales files should exist if default_locale is set
    expect(
      files.some((f) => f.includes(`_locales/${manifest.default_locale}`)),
    ).toBe(true)
  }
}
