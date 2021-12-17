import { isAsset, isChunk } from '$src/helpers'
import { Manifest } from '$src/types'
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

test('bundles chunks and assets', async () => {
  // Chunks
  const chunks = output.filter(isChunk)
  expect(chunks.find(byFileName('content.js'))).toBeDefined()
  expect(chunks.length).toBe(1)

  // Assets
  const assets = output.filter(isAsset)

  const styles1Asset = assets.find(({ fileName }) =>
    fileName.endsWith('css'),
  )!
  expect(styles1Asset).toBeDefined()
  const styles2Asset = assets.find(({ fileName }) =>
    fileName.endsWith('css'),
  )!
  expect(styles2Asset).toBeDefined()

  const manifestAsset = assets.find(byFileName('manifest.json'))!
  expect(manifestAsset).toBeDefined()
  const manifestSource = JSON.parse(
    manifestAsset.source as string,
  ) as Manifest
  expect(manifestSource).toMatchObject({
    content_scripts: [
      {
        matches: ['http://*/*', 'https://*/*'],
        js: ['content1/index.js'],
        css: [styles1Asset.fileName],
      },
      {
        matches: ['http://*/*', 'https://*/*'],
        js: ['content2/index.js'],
        css: [styles2Asset.fileName],
      },
    ],
  })

  expect(assets.length).toBe(2)
})
