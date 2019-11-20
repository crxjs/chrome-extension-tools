import { rollup } from 'rollup'
import config from './rollup.config'

import { reloader as r } from './reloader'

const reloader = r()

test.skip('calls reloader hooks', async () => {
  const bundle = await rollup(config)
  await bundle.generate(config.output)

  expect(reloader.startReloader).toBeCalled()
  expect(reloader.createClientFiles).toBeCalled()
  expect(reloader.updateManifest).toBeCalled()
  expect(reloader.reloadClients).not.toBeCalled()
})

test.skip('injects reloader scripts', async () => {
  const bundle = await rollup(config)
  const { output } = await bundle.generate(config.output)

  const assets = output.filter(({ isAsset }) => isAsset)

  expect(
    assets.find(
      ({ fileName }) =>
        fileName.includes('reloader-sw') &&
        fileName.endsWith('.js'),
    ),
  ).toBeTruthy()

  expect(
    assets.find(
      ({ fileName }) =>
        fileName.includes('reloader-client') &&
        fileName.endsWith('.js'),
    ),
  ).toBeTruthy()

  expect(
    assets.find(
      ({ fileName }) =>
        fileName.includes('reloader-wrapper') &&
        fileName.endsWith('.js'),
    ),
  ).toBeTruthy()
})
