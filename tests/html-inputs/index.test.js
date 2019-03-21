import assert from 'assert'

import fs from 'fs-extra'

import sinon from 'sinon'
import { rollup } from 'rollup'

import config from './fixtures/basic/rollup.config'

afterEach(() => {
  sinon.restore()
})

test('rollup bundles chunks', async () => {
  const bundle = await rollup(config)
  const { output } = await bundle.generate(config.output)

  assert(output.length === 4)
})

test('rollup writes html files', async () => {
  const stub = sinon.stub(fs, 'writeFile').usingPromise(Promise)
  await fs.remove('tests/fixtures/dest')

  const bundle = await rollup(config)
  await bundle.write(config.output)

  assert(stub.calledTwice)
  assert(stub.calledWith('tests/fixtures/dest/options.html'))
  assert(stub.calledWith('tests/fixtures/dest/popup.html'))
})
