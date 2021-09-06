import { isAsset, isChunk } from '$src/helpers'
import { byFileName } from '$test/helpers/utils'
import path from 'path'
import { RollupOutput } from 'rollup'
import { build } from 'vite'

const outDir = path.join(__dirname, 'dist-build')

let output: RollupOutput['output']
beforeAll(async () => {
  const { output: o } = (await build({
    configFile: path.join(__dirname, 'vite.config.ts'),
    envFile: false,
    build: { outDir },
  })) as RollupOutput

  output = o
}, 30000)

test('bundles chunks', async () => {
  // Chunks
  const chunks = output.filter(isChunk)

  expect(
    chunks.find(byFileName('background/index.js')),
  ).toBeDefined()
  expect(
    chunks.find(byFileName('content/index.js')),
  ).toBeDefined()
  expect(
    chunks.find(byFileName('pages/popup/index.js')),
  ).toBeDefined()

  expect(chunks.length).toBe(3)
})

test('bundles assets', async () => {
  // Assets
  const assets = output.filter(isAsset)
  expect(assets.find(byFileName('manifest.json'))).toBeDefined()
  expect(
    assets.find(byFileName('background/index.esm-wrapper.js')),
  ).toBeDefined()
  expect(
    assets.find(byFileName('pages/popup/index.html')),
  ).toBeDefined()

  // 1 esm wrapper, 1 html file and 1 manifest
  expect(assets.length).toBe(3)
})
