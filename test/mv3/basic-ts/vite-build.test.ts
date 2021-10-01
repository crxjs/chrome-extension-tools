import { isAsset, isChunk } from '$src/helpers'
import { jestSetTimeout } from '$test/helpers/timeout'
import { byFileName } from '$test/helpers/utils'
import path from 'path'
import { RollupOutput } from 'rollup'
import { build } from 'vite'

jestSetTimeout(30000)

test('bundles chunks', async () => {
  const { output } = (await build({
    configFile: path.join(__dirname, 'vite.config.ts'),
    envFile: false,
  })) as RollupOutput

  // Chunks
  const chunks = output.filter(isChunk)

  expect(
    chunks.find(byFileName('service_worker.js')),
  ).toBeDefined()
  expect(chunks.find(byFileName('content.js'))).toBeDefined()
  expect(chunks.find(byFileName('popup.js'))).toBeDefined()

  expect(chunks.length).toBe(3)

  // Assets
  const assets = output.filter(isAsset)
  expect(assets.find(byFileName('manifest.json'))).toBeDefined()
  expect(assets.find(byFileName('popup.html'))).toBeDefined()

  // 1 html file and 1 manifest
  expect(assets.length).toBe(2)
})
