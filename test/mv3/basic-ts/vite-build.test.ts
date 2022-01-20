import { parseManifest } from '$src/files_parseManifest'
import { isAsset, isChunk } from '$src/helpers'
import { jestSetTimeout } from '$test/helpers/timeout'
import { byFileName } from '$test/helpers/utils'
import path from 'path'
import { OutputAsset, RollupOutput } from 'rollup'
import { build } from 'vite'

jestSetTimeout(30000)

test('bundles chunks', async () => {
  const { output } = (await build({
    configFile: path.join(__dirname, 'vite.config.ts'),
    envFile: false,
  })) as RollupOutput

  const manifest = 'manifest.json'
  const manifestAsset = output.find(
    byFileName(manifest),
  ) as OutputAsset
  expect(manifestAsset).toBeDefined()
  const manifestSource = JSON.parse(
    manifestAsset.source as string,
  ) as chrome.runtime.Manifest
  expect(manifestSource).toMatchSnapshot(manifest)

  const parsed = Object.values(parseManifest(manifestSource))
  expect(parsed).toMatchSnapshot('parsed manifest')

  const files = Object.values(parsed).flatMap((x) => x)
  for (const filename of files) {
    const file = output.find(byFileName(filename))!
    const source = isChunk(file) ? file.code : file.source
    expect(source).toMatchSnapshot(filename)
  }

  // 3 scripts + vendors chunk
  expect(output.filter(isChunk).length).toBe(4)
  // html file, content script wrapper + manifest
  expect(output.filter(isAsset).length).toBe(3)
})
