import assert from 'assert'

import fs from 'fs-extra'

import sinon from 'sinon'
import { rollup } from 'rollup'

import basic from './fixtures/basic/rollup.config'

afterEach(() => {
  sinon.restore()
})

test('rollup writes html files', async () => {
  const stub = sinon.stub(fs, 'writeFile').usingPromise(Promise)
  await fs.remove('tests/fixtures/dest')

  const bundle = await rollup(basic)
  await bundle.write(basic.output)

  assert(stub.calledTwice)
  assert(stub.calledWith('tests/fixtures/dest/options.html'))
  assert(stub.calledWith('tests/fixtures/dest/popup.html'))
})
