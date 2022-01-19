import { runtimeReloaderCS } from '$src/plugin-runtimeReloader'
import {
  filesReady,
  stopFileWriter,
} from '$src/plugin-viteServeFileWriter'
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
  const content = 'content.js'
  const wrapper = 'assets/content.esm-wrapper-a6ac6bbe.js'
  const worker = 'background.js'
  const popupJs = 'popup.js'

  const manifestPath = path.join(outDir, manifest)
  const manifestSource = await fs.readJson(manifestPath)
  expect(manifestSource).toMatchSnapshot()

  const wrapperPath = path.join(outDir, content)
  const wrapperSource = await fs.readFile(wrapperPath, 'utf8')
  expect(wrapperSource).toMatchSnapshot(wrapper)

  const contentPath = path.join(outDir, content)
  const contentSource = await fs.readFile(contentPath, 'utf8')
  expect(contentSource).toMatchSnapshot(content)

  const popupPath = path.join(outDir, popup)
  const popupSource = await fs.readFile(popupPath, 'utf8')
  expect(popupSource).toMatchSnapshot(popup)

  const workerPath = path.join(outDir, worker)
  const workerSource = await fs.readFile(workerPath, 'utf8')
  // can't use snapshot, injected server port varies
  expect(workerSource).toMatch(
    'fetchEvent.respondWith(mapRequestsToLocalhost(url.href))',
  )

  const popupJsPath = path.join(outDir, popupJs)
  expect(fs.existsSync(popupJsPath)).toBe(false)
})
