import sinon from 'sinon'
import { rollup } from 'rollup'

import basic from './fixtures/basic/rollup.config'

afterEach(() => {
  sinon.restore()
})

test('basic', async () => {
  const bundle = await rollup(basic)
  const { output } = await bundle.generate(basic.output)

  const chunks = output.filter(({ isAsset }) => !isAsset)
  const assets = output.filter(({ isAsset }) => isAsset)

  expect(chunks.length).toBe(4)
  expect(assets.length).toBe(3)
})
