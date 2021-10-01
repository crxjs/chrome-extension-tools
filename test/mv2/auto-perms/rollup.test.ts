import { isAsset } from '$src/helpers'
import { Manifest } from '$src/types'
import { getRollupOutput } from '$test/helpers/getRollupOutput'
import { jestSetTimeout } from '$test/helpers/timeout'
import { byFileName } from '$test/helpers/utils'

jestSetTimeout(30000)

process.chdir(__dirname)

test('detects correct permissions', async () => {
  const { output } = await getRollupOutput(
    __dirname,
    'rollup.config.js',
  )

  const assets = output.filter(isAsset)
  const manifestJson = assets.find(byFileName('manifest.json'))!
  const { permissions } = JSON.parse(
    manifestJson.source as string,
  ) as Manifest

  expect(permissions).toEqual(['notifications'])
})
