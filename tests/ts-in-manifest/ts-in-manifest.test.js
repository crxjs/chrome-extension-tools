import { rollup } from 'rollup'
import config from './rollup.config'

test('bundles chunks and assets', async () => {
  const bundle = await rollup(config)
  const { output } = await bundle.generate(config.output)

  const manifest = output.find(({ fileName }) =>
    fileName.endsWith('manifest.json'),
  )

  expect(manifest).toBeDefined()
  expect(manifest.source).toMatch(/assets\/background-.+?\.js/)
  expect(manifest.source).toMatch('content.js')
  expect(manifest.source).toMatch('react.js')
}, 15000)
