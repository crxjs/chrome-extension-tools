import { filesEmitted } from '$src/shimPluginContext'
import fs from 'fs-extra'
import path from 'path'
import { createServer, ViteDevServer } from 'vite'

jest.spyOn(console, 'log').mockImplementation(jest.fn())

const distDir = path.join(__dirname, 'dist-serve')

let devServer: ViteDevServer
beforeAll(async () => {
  await fs.remove(distDir)

  devServer = await createServer({
    configFile: path.join(__dirname, 'vite.config.ts'),
    envFile: false,
  })
})

afterAll(async () => {
  await devServer.close()
})

test('writes entry points to disk', async () => {
  expect(fs.existsSync(distDir)).toBe(false)

  await Promise.all([devServer.listen(2000), filesEmitted()])

  const assets = [
    'manifest.json',
    'popup.html',
    'content.esm-wrapper.js',
  ]

  expect(fs.existsSync(distDir)).toBe(true)

  for (const asset of assets) {
    expect(fs.existsSync(path.join(distDir, asset))).toBe(true)
  }
}, 60000)
