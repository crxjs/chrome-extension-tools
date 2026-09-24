import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, normalize } from 'pathe'
import { build } from 'vite'
import { afterEach, expect, test } from 'vitest'
import { crx } from 'src/.'

let rootDir: string | undefined

function writeFixture(fileName: string, source: string) {
  const filePath = join(rootDir!, fileName)
  mkdirSync(dirname(filePath), { recursive: true })
  writeFileSync(filePath, source)
}

function getImportPath(source: string) {
  return (
    source.match(/import\s+["']([^"']+)["']/)?.[1] ??
    source.match(/import\([\s\S]*?["']([^"']+)["'][\s\S]*?\)/)?.[1]
  )
}

function resolveImportPath(importer: string, importPath: string) {
  return normalize(join(dirname(importer), importPath))
}

afterEach(() => {
  if (rootDir) rmSync(rootDir, { recursive: true, force: true })
  rootDir = undefined
})

test('builds duplicate-basename content scripts and nested MAIN world loaders', async () => {
  rootDir = mkdtempSync(join(tmpdir(), 'crxjs-content-script-paths-'))
  const distDir = join(rootDir, 'dist')

  writeFixture(
    'src/shared.ts',
    `export function log(message: string) { console.log(message) }`,
  )
  writeFixture(
    'src/seller/content.ts',
    `import { log } from '../shared'; export function onExecute() { log('seller-content') }`,
  )
  writeFixture(
    'src/cmp/content.ts',
    `import { log } from '../shared'; export function onExecute() { log('cmp-content') }`,
  )
  writeFixture(
    'src/marketplace/content.ts',
    `import { log } from '../shared'; export function onExecute() { log('marketplace-content') }`,
  )
  writeFixture('src/worker/content.ts', `console.log('background-content')`)

  await build({
    root: rootDir,
    configFile: false,
    envFile: false,
    logLevel: 'error',
    build: { outDir: distDir, minify: false },
    plugins: [
      crx({
        manifest: {
          manifest_version: 3,
          name: 'Content Script Path Compatibility Test',
          version: '1.0.0',
          background: { service_worker: 'src/worker/content.ts' },
          content_scripts: [
            {
              js: ['src/seller/content.ts'],
              matches: ['https://seller.example/*'],
            },
            {
              js: ['src/cmp/content.ts'],
              matches: ['https://cmp.example/*'],
            },
            {
              js: ['src/marketplace/content.ts'],
              matches: ['https://marketplace.example/*'],
              world: 'MAIN',
            },
          ],
        },
      }),
    ],
  })

  const manifest = JSON.parse(
    readFileSync(join(distDir, 'manifest.json'), 'utf8'),
  )
  const contentScriptFiles = manifest.content_scripts.flatMap(
    ({ js }: { js: string[] }) => js,
  )

  expect(contentScriptFiles).toHaveLength(3)
  expect(new Set(contentScriptFiles).size).toBe(contentScriptFiles.length)

  const mainWorldLoader = manifest.content_scripts.find(
    ({ world }: { world?: string }) => world === 'MAIN',
  ).js[0]
  const mainWorldLoaderSource = readFileSync(
    join(distDir, mainWorldLoader),
    'utf8',
  )
  const mainWorldChunkPath = resolveImportPath(
    mainWorldLoader,
    getImportPath(mainWorldLoaderSource)!,
  )

  expect(mainWorldChunkPath).toContain('marketplace')
  expect(
    existsSync(join(distDir, mainWorldChunkPath)),
    mainWorldChunkPath,
  ).toBe(true)
})
