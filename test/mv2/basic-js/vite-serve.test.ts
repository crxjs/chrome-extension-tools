import {
  runtimeReloaderBG,
  runtimeReloaderCS,
} from '$src/plugin-runtimeReloader'
import { filesReady } from '$src/plugin-viteServeFileWriter'
import { jestSetTimeout } from '$test/helpers/timeout'
import fs from 'fs-extra'
import path from 'path'
import { createServer, ViteDevServer } from 'vite'

jestSetTimeout(15000)

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

test('writes entry points to disk', async () => {
  expect(fs.existsSync(outDir)).toBe(false)

  await Promise.all([devServer.listen(), filesReady()])

  const { port } = devServer.config.server

  expect(fs.existsSync(outDir)).toBe(true)

  const manifest = 'manifest.json'
  const popup = 'popup.html'
  const content = 'content.js'
  const background = 'background.esm-wrapper.js'

  const manifestPath = path.join(outDir, manifest)
  const manifestSource = await fs.readJson(manifestPath)

  expect(manifestSource).toMatchObject({
    browser_action: {
      default_popup: popup,
    },
    background: {
      scripts: [runtimeReloaderBG, background],
    },
    content_scripts: [
      {
        js: [runtimeReloaderCS, content],
        matches: ['https://a.com/*', 'http://b.com/*'],
      },
    ],
  })

  const contentPath = path.join(outDir, content)
  const contentSource = await fs.readFile(contentPath, 'utf8')
  expect(contentSource).toMatchSnapshot()

  const popupPath = path.join(outDir, popup)
  const popupSource = await fs.readFile(popupPath, 'utf8')
  expect(popupSource).toMatch(
    `<script src="http://localhost:${port}/popup.jsx" type="module">`,
  )
  expect(popupSource).toMatch(
    `<script type="module" src="http://localhost:${port}/@vite/client">`,
  )

  const backgroundPath = path.join(outDir, background)
  const backgroundSource = await fs.readFile(
    backgroundPath,
    'utf8',
  )
  expect(backgroundSource).toMatch('./background.js')
})
