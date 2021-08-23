import { isAsset, isChunk } from '$src/helpers'
import { deriveFiles } from '$src/manifest-input/manifest-parser'
import { getRollupOutput } from '$test/helpers/getRollupOutput'
import { byFileName } from '$test/helpers/utils'
import path from 'path'

const outputPromise = getRollupOutput(
  __dirname,
  'rollup.config.js',
)

test('bundles chunks and assets', async () => {
  const { output } = await outputPromise

  // Chunks
  const chunks = output.filter(isChunk)
  expect(chunks.length).toBe(3)
  // 2 chunks + one shared import (imported.js)
  expect(
    chunks.find(byFileName('background/background.js')),
  ).toBeDefined()
  expect(
    chunks.find(byFileName('content/content.js')),
  ).toBeDefined()

  const imported = chunks.find(({ fileName }) =>
    fileName.includes('imported'),
  )
  // Chunk should be in correct folder and not be double hashed
  expect(imported?.fileName).toMatch(
    /^chunks\/imported-[a-z0-9]+?\.js$/,
  )
})

test('bundles assets', async () => {
  const { output } = await outputPromise

  // Assets
  const assets = output.filter(isAsset)
  expect(assets.length).toBe(3)
  // 2 dynamic import wrappers and the manifest
  const manifestJson = assets.find(byFileName('manifest.json'))
  expect(manifestJson).toBeDefined()
})

test('chunks in output match chunks in manifest', async () => {
  const { output } = await outputPromise

  const assets = output.filter(isAsset)
  const manifestJson = assets.find(byFileName('manifest.json'))!
  const manifest = JSON.parse(
    manifestJson.source as string,
  ) as chrome.runtime.Manifest

  // Get scripts in manifest
  const srcDir = path.join(__dirname, 'src')
  const { js } = deriveFiles(manifest, srcDir, {
    contentScripts: true,
  })

  js.map((x) => path.relative(srcDir, x)).forEach((script) => {
    const chunk = output.find(byFileName(script))
    expect(chunk).toBeDefined()
  })
})
