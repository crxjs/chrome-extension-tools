import { parseManifest } from '$src/files_parseManifest'
import { isAsset, isChunk } from '$src/helpers'
import { Manifest } from '$src/types'
import { getRollupOutput } from '$test/helpers/getRollupOutput'
import { jestSetTimeout } from '$test/helpers/timeout'
import { byFileName } from '$test/helpers/utils'
import { OutputAsset } from 'rollup'

jestSetTimeout(30000)

test('bundles chunks and assets', async () => {
  const { output } = await getRollupOutput(
    __dirname,
    'rollup.config.js',
  )

  const manifest = 'manifest.json'
  const manifestAsset = output.find(
    byFileName(manifest),
  ) as OutputAsset
  expect(manifestAsset).toBeDefined()
  const manifestSource = JSON.parse(
    manifestAsset.source as string,
  ) as Manifest
  expect(manifestSource).toMatchSnapshot(manifest)

  const parsed = Object.values(parseManifest(manifestSource))
  expect(parsed).toMatchSnapshot('parsed manifest')

  const files = Object.values(parsed).flatMap((x) => x)
  for (const filename of files) {
    const file = output.find(byFileName(filename))!
    const source = isChunk(file) ? file.code : file.source
    expect(source).toMatchSnapshot(filename)
  }

  expect(output.filter(isChunk).length).toBe(3)
  expect(output.filter(isAsset).length).toBe(3)
})
