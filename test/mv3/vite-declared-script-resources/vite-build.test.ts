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
  const content1 = 'content1.js'
  const wrapper1 = 'assets/content1.esm-wrapper-108a94d4.js'
  const content2 = 'content2.js'
  const wrapper2 = 'assets/content2.esm-wrapper-c289b262.js'
  const script = 'script.js'
  const font = 'assets/font.bb6bc8d6.otf'
  const html = 'iframe.html'
  const image = 'assets/image.51f8fe9d.png'
  const manifest = 'manifest.json'

  expect(output.find(byFileName(content1))).toBeDefined()
  expect(output.find(byFileName(wrapper1))).toBeDefined()
  expect(output.find(byFileName(content2))).toBeDefined()
  expect(output.find(byFileName(wrapper2))).toBeDefined()
  expect(output.find(byFileName(script))).toBeDefined()
  expect(output.find(byFileName(html))).toBeDefined()
  expect(output.find(byFileName(font))).toBeDefined()
  expect(output.find(byFileName(image))).toBeDefined()
  expect(output.filter(isChunk).length).toBe(3)
  expect(output.filter(isAsset).length).toBe(6)

  const manifestAsset = output.find(
    byFileName(manifest),
  ) as OutputAsset
  expect(manifestAsset).toBeDefined()
  const manifestSource = JSON.parse(
    manifestAsset.source as string,
  ) as Manifest
  expect(manifestSource).toMatchSnapshot(manifest)
})
