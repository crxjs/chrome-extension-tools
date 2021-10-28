import { filesReady } from '$src/plugin-viteServeFileWriter'
import fs from 'fs-extra'
import path from 'path'
import { createServer, ViteDevServer } from 'vite'

process.chdir(__dirname)

const outDir = path.join(__dirname, 'dist-serve')

let devServer: ViteDevServer
beforeAll(async () => {
  await fs.remove(outDir)

  devServer = await createServer({
    configFile: 'vite.config.ts',
    envFile: false,
    build: { outDir },
  })
})

afterAll(async () => {
  await devServer.close()
})

test.skip('writes entry points to disk', async () => {
  await Promise.all([devServer.listen(), filesReady()])

  const manifest = 'manifest.json'
  const manifestPath = path.join(outDir, manifest)
  const manifestSource = await fs.readJson(manifestPath)

  expect(manifestSource).toMatchObject({
    permissions: ['notifications'],
  })
})
