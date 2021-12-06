import { filesReady } from '$src/plugin-viteServeFileWriter'
import { jestSetTimeout } from '$test/helpers/timeout'
import fs from 'fs-extra'
import path from 'path'
import { createServer, ViteDevServer } from 'vite'

jestSetTimeout(5000)

const outDir = path.join(__dirname, 'dist-serve')

let devServer: ViteDevServer
beforeAll(async () => {
  await fs.remove(outDir)

  devServer = await createServer({
    configFile: path.join(__dirname, 'vite.config.ts'),
    envFile: false,
    build: { outDir },
  })
})

test('validation errors rise', async () => {
  expect(fs.existsSync(outDir)).toBe(false)

  await expect(
    Promise.all([devServer.listen(), filesReady()]),
  ).rejects.toThrow()

  expect(console.error).toBeCalled()
})
