import { parseManifest } from '$src/files_parseManifest'
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
  const manifest = 'manifest.json'
  const manifestAsset = output.find(
    byFileName(manifest),
  ) as OutputAsset
  expect(manifestAsset).toBeDefined()
  const manifestSource = JSON.parse(
    manifestAsset.source as string,
  ) as Manifest
  expect(manifestSource).toMatchSnapshot(manifest)

  const files = Object.values(
    parseManifest(manifestSource),
  ).reduce((r, x) => [...r, ...x], [] as string[])

  expect(files).toMatchSnapshot('files')

  for (const filename of files) {
    const file = output.find(byFileName(filename))!
    const source = isChunk(file) ? file.code : file.source
    expect(source).toMatchSnapshot(filename)
  }

  expect(output.filter(isChunk).length).toBe(2)
  expect(output.filter(isAsset).length).toBe(5)
})
