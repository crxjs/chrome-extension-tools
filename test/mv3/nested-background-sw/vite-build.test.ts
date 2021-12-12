import { isAsset, isChunk } from '$src/helpers'
import { swWrapperName } from '$src/plugin-backgroundESM_MV3'
import { jestSetTimeout } from '$test/helpers/timeout'
import { byFileName } from '$test/helpers/utils'
import fs from 'fs-extra'
import path from 'path'
import { RollupOutput } from 'rollup'
import { build } from 'vite'

jestSetTimeout(30000)

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
})

test('bundles chunks', async () => {
  // Chunks
  const chunks = output.filter(isChunk)
  expect(
    chunks.find(byFileName('background/sw.js')),
  ).toBeDefined()
  expect(chunks.length).toBe(1)

  // Assets
  const assets = output.filter(isAsset)
  expect(assets.find(byFileName('manifest.json'))).toBeDefined()
  expect(assets.find(byFileName(swWrapperName)))
  expect(assets.length).toBe(2)
})
