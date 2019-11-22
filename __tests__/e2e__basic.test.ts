import { rollup } from 'rollup'
import { isAsset, isChunk } from '../src/helpers'
import { byFileName, getExtPath } from '../__fixtures__/utils'

const { default: config } = require(getExtPath(
  'basic/rollup.config.js',
))

test('bundles chunks and assets', async () => {
  const bundle = await rollup(config)
  const { output } = await bundle.generate(config.output)

  // Chunks
  const chunks = output.filter(isChunk)
  expect(chunks.length).toBe(7)
  expect(output.find(byFileName('background.js'))).toBeDefined()
  expect(output.find(byFileName('content.js'))).toBeDefined()
  expect(output.find(byFileName('options1.js'))).toBeDefined()
  expect(output.find(byFileName('options2.js'))).toBeDefined()
  expect(output.find(byFileName('options3.js'))).toBeDefined()
  expect(output.find(byFileName('options4.js'))).toBeDefined()
  expect(output.find(byFileName('popup/popup.js'))).toBeDefined()

  // Assets
  const assets = output.filter(isAsset)
  expect(assets.length).toBe(13)
  expect(output.find(byFileName('asset.js'))).toBeDefined()
  expect(output.find(byFileName('popup/popup.html'))).toBeDefined()
  expect(output.find(byFileName('images/icon-main-16.png'))).toBeDefined()
  expect(output.find(byFileName('images/icon-main-48.png'))).toBeDefined()
  expect(output.find(byFileName('images/icon-main-128.png'))).toBeDefined()
  expect(output.find(byFileName('options.html'))).toBeDefined()
  expect(output.find(byFileName('options.css'))).toBeDefined()
  expect(output.find(byFileName('content.css'))).toBeDefined()
  expect(output.find(byFileName('options.png'))).toBeDefined()
  expect(output.find(byFileName('options.jpg'))).toBeDefined()
  expect(output.find(byFileName('manifest.json'))).toBeDefined()
  // plus 2 wrappers background and content
})
