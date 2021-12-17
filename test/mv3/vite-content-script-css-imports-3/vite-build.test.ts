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
  const content1 = 'content1/index.js'
  const content2 = 'content2/index.js'
  const styles1 = 'assets/index-5f7d7b6f.css'
  const styles2 = 'assets/index-5dfee6cc.css'
  const styles3 = 'assets/import-3b031dc7.css'
  const manifest = 'manifest.json'

  expect(output.find(byFileName(content1))).toBeDefined()
  expect(output.find(byFileName(content2))).toBeDefined()
  expect(output.find(byFileName(styles1))).toBeDefined()
  expect(output.find(byFileName(styles2))).toBeDefined()
  expect(output.find(byFileName(styles3))).toBeDefined()
  expect(output.filter(isChunk).length).toBe(2)
  expect(output.filter(isAsset).length).toBe(4)

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
        css: [styles1, styles3],
        js: [content1],
        matches: ['http://*/*', 'https://*/*'],
      },
      {
        css: [styles2, styles3],
        js: [content2],
        matches: ['http://*/*', 'https://*/*'],
      },
    ],
  })
})
