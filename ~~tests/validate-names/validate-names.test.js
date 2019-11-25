import sinon from 'sinon'
import { rollup } from 'rollup'

import config from './rollup.config'

const build = async (config) => {
  const bundle = await rollup(config)
  const { output } = await bundle.generate(config.output)
  // const { output } = await bundle.write(config.output)

  const chunks = output.filter(({ isAsset }) => !isAsset)
  const assets = output.filter(({ isAsset }) => isAsset)

  return { chunks, assets }
}

afterEach(() => {
  sinon.restore()
})

test('names do not include invalid chars', async () => {
  const rightName = 'commonjsHelpers'
  const wrongName = '_commonjsHelpers'

  const { chunks, assets } = await build(config)

  const helpers =
    chunks.find(({ fileName }) =>
      fileName.includes(rightName),
    ) || {}

  expect(helpers.fileName.startsWith(wrongName)).toBe(false)

  const manifest = assets.find(
    ({ fileName }) => fileName === 'manifest.json',
  )

  expect(manifest.source.includes(rightName)).toBe(true)
  expect(manifest.source.includes(wrongName)).toBe(false)

  chunks.forEach(({ code, imports }) => {
    expect(code.includes(wrongName)).toBe(false)
    expect(imports.some((i) => i.startsWith(wrongName))).toBe(
      false,
    )
  })

  assets.forEach(({ source }) => {
    expect(source.includes(wrongName)).toBe(false)
  })
}, 15000)
