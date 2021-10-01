import { isAsset } from '$src/helpers'
import { Manifest } from '$src/types'
import { jestSetTimeout } from '$test/helpers/timeout'
import { byFileName } from '$test/helpers/utils'
import fs from 'fs-extra'
import path from 'path'
import { RollupOutput } from 'rollup'
import { build } from 'vite'

jestSetTimeout(30000)

process.chdir(__dirname)

const outDir = path.join(__dirname, 'dist-build')

beforeAll(() => fs.remove(outDir))

test('detects correct permissions', async () => {
  const { output } = (await build({
    configFile: 'vite.config.ts',
    envFile: false,
    build: { outDir },
  })) as RollupOutput

  const assets = output.filter(isAsset)
  const manifestJson = assets.find(byFileName('manifest.json'))!
  const { permissions } = JSON.parse(
    manifestJson.source as string,
  ) as Manifest

  expect(permissions).toEqual(['notifications'])
})
