import { ManifestV3 } from '$src'
import { isAsset, isChunk } from '$src/helpers'
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

  const background = 'background.js'
  const backgroundJs = chunks.find(byFileName(background))!
  expect(backgroundJs).toBeDefined()
  expect(backgroundJs.code).toMatchSnapshot(background)

  const content = 'content.js'
  const contentJs = chunks.find(byFileName(content))!
  expect(contentJs).toBeDefined()
  expect(contentJs.code).toMatchSnapshot(content)

  const popup = 'popup.js'
  const popupJs = chunks.find(byFileName(popup))!
  expect(popupJs).toBeDefined()
  expect(popupJs.code).toMatchSnapshot(popup)

  // 3 scripts + vendors chunk
  expect(chunks.length).toBe(4)

  // Assets
  const assets = output.filter(isAsset)
  const manifest = 'manifest.json'
  const manifestJson = assets.find(byFileName(manifest))!
  expect(manifestJson).toBeDefined()
  const manifestSource = JSON.parse(
    manifestJson.source as string,
  ) as ManifestV3
  expect(manifestSource).toMatchSnapshot(manifest)

  const popupHtml = 'popup.html'
  const popupHtmlAsset = assets.find(byFileName(popupHtml))!
  expect(popupHtmlAsset).toBeDefined()
  expect(popupHtmlAsset.source!).toMatchSnapshot(popupHtml)

  // html file, content script wrapper, and the manifest
  expect(assets.length).toBe(3)
})
