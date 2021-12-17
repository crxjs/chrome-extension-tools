import { isAsset, isChunk } from '$src/helpers'
import { Manifest } from '$src/types'
import { jestSetTimeout } from '$test/helpers/timeout'
import { byFileName } from '$test/helpers/utils'
import fs from 'fs-extra'
import path from 'path'
import { OutputAsset, RollupOutput } from 'rollup'
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
  const content = 'content.js'
  const styles = 'assets/content-89281590.css'
  const manifest = 'manifest.json'

  expect(output.find(byFileName(content))).toBeDefined()
  expect(output.find(byFileName(styles))).toBeDefined()
  expect(output.filter(isChunk).length).toBe(1)
  expect(output.filter(isAsset).length).toBe(2)

  const manifestAsset = output.find(
    byFileName(manifest),
  ) as OutputAsset
  expect(manifestAsset).toBeDefined()
  const manifestSource = JSON.parse(
    manifestAsset.source as string,
  ) as Manifest
  expect(manifestSource).toMatchObject({
    content_scripts: [
      {
        css: [styles],
        js: [content],
        matches: ['http://*/*', 'https://*/*'],
      },
    ],
  })
})
