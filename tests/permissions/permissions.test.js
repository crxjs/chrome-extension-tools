import { rollup } from 'rollup'
import config from './rollup.config'

console.log = jest.fn()
console.warn = jest.fn()
console.error = jest.fn()

it('detects background permissions', async () => {
  const bundle = await rollup(config)
  const { output } = await bundle.write(config.output)

  const manifest = JSON.parse(
    output.find(({ fileName }) =>
      fileName.endsWith('manifest.json'),
    ).source,
  )

  expect(manifest.permissions).toBeInstanceOf(Array)

  // chrome support
  expect(manifest.permissions).toContain('contextMenus')
  // chromep support
  expect(manifest.permissions).toContain('cookies')
  // library support
  expect(manifest.permissions).toContain('notifications')
})

it('detects content permissions', async () => {
  const bundle = await rollup(config)
  const { output } = await bundle.generate(config.output)

  const manifest = JSON.parse(
    output.find(({ fileName }) =>
      fileName.endsWith('manifest.json'),
    ).source,
  )

  expect(manifest.permissions).toBeInstanceOf(Array)

  // chrome support
  expect(manifest.permissions).toContain('bookmarks')
  // chromep support
  expect(manifest.permissions).toContain('alarms')
  // library support
  expect(manifest.permissions).toContain('storage')
})

it('detects chunk permissions', async () => {
  const bundle = await rollup(config)
  const { output } = await bundle.generate(config.output)

  const manifest = JSON.parse(
    output.find(({ fileName }) =>
      fileName.endsWith('manifest.json'),
    ).source,
  )

  expect(manifest.permissions).toBeInstanceOf(Array)

  expect(manifest.permissions).toContain('downloads')
})

it('detects html script permissions', async () => {
  const bundle = await rollup(config)
  const { output } = await bundle.generate(config.output)

  const manifest = JSON.parse(
    output.find(({ fileName }) =>
      fileName.endsWith('manifest.json'),
    ).source,
  )

  expect(manifest.permissions).toBeInstanceOf(Array)

  // chrome support
  expect(manifest.permissions).toContain('declarativeContent')
  // chromep support
  expect(manifest.permissions).toContain('desktopCapture')
})
