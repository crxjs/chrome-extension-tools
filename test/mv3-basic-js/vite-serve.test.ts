import fs from 'fs-extra'
import path from 'path'
import { createServer, ViteDevServer } from 'vite'

jest.spyOn(console, 'log').mockImplementation(jest.fn())

const distDir = path.join(__dirname, 'dist-serve')

let devServer: ViteDevServer
beforeAll(async () => {
  devServer = await createServer({
    configFile: path.join(__dirname, 'vite.config.ts'),
    envFile: false,
  })

  await devServer.listen(2000)
})

afterAll(async () => {
  await devServer.close()
})

test('writes entry points to disk', async () => {
  const assets = [
    'manifest.json',
    'content.js',
    'popup.html',
    'service_worker.js',
  ]

  expect(fs.existsSync(distDir)).toBe(true)

  for (const asset of assets) {
    expect(fs.existsSync(path.join(distDir, asset))).toBe(true)
  }
}, 60000)
