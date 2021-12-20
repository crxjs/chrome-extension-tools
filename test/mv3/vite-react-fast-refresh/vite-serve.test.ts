import {
  filesReady,
  stopFileWriter,
} from '$src/plugin-viteServeFileWriter'
import { Manifest } from '$src/types'
import { jestSetTimeout } from '$test/helpers/timeout'
import fs from 'fs-extra'
import path from 'path'
import { createServer, ViteDevServer } from 'vite'

jestSetTimeout(30000)

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

afterAll(async () => {
  stopFileWriter()
  await devServer.close()
})

test('writes entry points to disk', async () => {
  expect(fs.existsSync(outDir)).toBe(false)

  await Promise.all([devServer.listen(), filesReady()])

  expect(fs.existsSync(outDir)).toBe(true)

  const manifest = 'manifest.json'
  const popup = 'popup.html'

  const manifestPath = path.join(outDir, manifest)
  const manifestSource: Manifest = await fs.readJson(
    manifestPath,
  )
  expect(manifestSource.content_security_policy).toBeUndefined()

  const popupPath = path.join(outDir, popup)
  const popupSource = await fs.readFile(popupPath, 'utf8')
  expect(popupSource).toMatchSnapshot()
})
