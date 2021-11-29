import { filesReady } from '$src/plugin-viteServeFileWriter'
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
  await devServer.close()
})

test('writes entry points to disk', async () => {
  expect(fs.existsSync(outDir)).toBe(false)

  await Promise.all([devServer.listen(), filesReady()])

  const { port } = devServer.config.server

  expect(fs.existsSync(outDir)).toBe(true)

  const manifest = 'manifest.json'
  const popup = 'pages/popup/index.html'

  const manifestPath = path.join(outDir, manifest)
  const manifestSource: Manifest = await fs.readJson(
    manifestPath,
  )

  expect(manifestSource.content_security_policy).toMatch(
    `http://localhost:${port}`,
  )
  expect(manifestSource.content_security_policy).toMatch(
    'sha256-',
  )

  const popupPath = path.join(outDir, popup)
  const popupSource = await fs.readFile(popupPath, 'utf8')
  expect(popupSource).toMatch(
    `http://localhost:${port}/pages/popup/index.tsx`,
  )
  expect(popupSource).toMatch(
    `
import RefreshRuntime from "http://localhost:${port}/@react-refresh"
RefreshRuntime.injectIntoGlobalHook(window)
window.$RefreshReg$ = () => {}
window.$RefreshSig$ = () => (type) => type
window.__vite_plugin_react_preamble_installed__ = true
    `.trim(),
  )
})
