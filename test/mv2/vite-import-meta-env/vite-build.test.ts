import { isChunk } from '$src/helpers'
import { jestSetTimeout } from '$test/helpers/timeout'
import { byFileName } from '$test/helpers/utils'
import path from 'path'
import { RollupOutput } from 'rollup'
import { build } from 'vite'

jestSetTimeout(30000)

const outDir = path.join(__dirname, 'dist-build')

test('bundles chunks', async () => {
  const { output } = (await build({
    configFile: path.join(__dirname, 'vite.config.ts'),
    build: { outDir },
  })) as RollupOutput

  // Chunks
  const chunks = output.filter(isChunk)

  const noImports = chunks.find(byFileName('with-0-imports.js'))
  expect(noImports?.code).toMatch('console.log("a")')
  expect(noImports?.code).not.toMatch('let __importMetaEnv;')

  const oneImports = chunks.find(byFileName('with-1-imports.js'))
  expect(oneImports?.code).toMatch('const a = "a";')
  expect(oneImports?.code).not.toMatch('let __importMetaEnv;')

  const twoImports = chunks.find(byFileName('with-2-imports.js'))
  expect(twoImports?.code).toMatch('const d = "d";')
  expect(twoImports?.code).not.toMatch('let __importMetaEnv;')

  expect(chunks.length).toBe(3)
})
