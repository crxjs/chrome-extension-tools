import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { runInNewContext } from 'node:vm'
import { join } from 'pathe'
import { build, version as viteVersion, type InlineConfig } from 'vite'
import { afterEach, expect, test } from 'vitest'
import { crx } from 'src/.'

const testVite8 = parseInt(viteVersion, 10) >= 8 ? test : test.skip
let root: string | undefined

afterEach(() => {
  if (root) rmSync(root, { recursive: true, force: true })
  root = undefined
})

async function buildScripts(
  config: InlineConfig,
  source = `console.log('started'); globalThis.__result = 42;`,
  extension = 'ts',
) {
  root = mkdtempSync(join(tmpdir(), 'crxjs-iife-options-'))
  const files = [`standalone.${extension}`, `named.iife.${extension}`]
  for (const file of files) writeFileSync(join(root, file), source)
  await build({
    ...config,
    root,
    configFile: false,
    envFile: false,
    logLevel: 'error',
    plugins: [
      crx({
        manifest: {
          manifest_version: 3,
          name: 'IIFE build options',
          version: '1.0.0',
          content_scripts: [{ js: files, matches: ['<all_urls>'] }],
        },
        contentScripts: { standaloneFiles: [files[0]] },
      }),
    ],
  })
  return files.map((file) =>
    readFileSync(join(root!, 'dist', file.replace(/\.[^.]+$/, '.js')), 'utf8'),
  )
}

function execute(code: string) {
  const logs: unknown[] = []
  const context = {
    console: { log: (...args: unknown[]) => logs.push(args) },
    __result: undefined,
  }
  runInNewContext(code, context)
  return { result: context.__result, logs }
}

test('preserves script behavior when minification is disabled', async () => {
  for (const code of await buildScripts({ build: { minify: false } })) {
    expect(execute(code)).toEqual({ result: 42, logs: [['started']] })
  }
})

testVite8.each(['object', 'array'] as const)(
  'inherits output minifier options from %s output',
  async (shape) => {
    const output = { minify: { compress: { dropConsole: true } } }
    const config = {
      build: {
        minify: true,
        rolldownOptions: { output: shape === 'array' ? [output] : output },
      },
    }
    for (const code of await buildScripts(config)) {
      expect(code).not.toContain('console.')
      expect(execute(code)).toEqual({ result: 42, logs: [] })
    }
  },
)

testVite8('preserves explicit output.minify false', async () => {
  const config = {
    build: { minify: true, rolldownOptions: { output: { minify: false } } },
  }
  for (const code of await buildScripts(config)) {
    expect(code).toContain('\n')
    expect(execute(code)).toEqual({ result: 42, logs: [['started']] })
  }
})

testVite8('inherits Oxc JSX transform options', async () => {
  const config = {
    oxc: { jsx: { runtime: 'classic', pragma: 'makeElement' } },
    build: { minify: false },
  }
  const source = `function makeElement(tag) { return tag }; globalThis.__result = <section />;`
  for (const code of await buildScripts(config, source, 'tsx')) {
    expect(execute(code)).toEqual({ result: 'section', logs: [] })
  }
})
