import { isAsset, isChunk } from '$src/helpers'
import { byFileName } from '$test/helpers/utils'
import fs from 'fs-extra'
import path from 'path'
import { RollupOutput } from 'rollup'
import { build } from 'vite'

const outDir = path.join(__dirname, 'dist-build')

let output: RollupOutput['output']
beforeAll(async () => {
  await fs.remove(outDir)

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

  expect(chunks.find(byFileName('background.js'))).toBeDefined()
  expect(chunks.find(byFileName('content.js'))).toBeDefined()
  expect(chunks.find(byFileName('popup.js'))).toBeDefined()

  expect(chunks.length).toBe(3)
})

test('bundles assets', async () => {
  // Assets
  const assets = output.filter(isAsset)

  expect(assets.find(byFileName('manifest.json'))).toBeDefined()
  expect(assets.find(byFileName('popup.html'))).toBeDefined()
  expect(assets.find(byFileName('background.esm-wrapper.js')))

  // 1 dyanmic import wrapper, an html file and the manifest
  expect(assets.length).toBe(3)
})
