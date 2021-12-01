import { filesReady } from '$src/plugin-viteServeFileWriter'
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

  expect(fs.existsSync(outDir)).toBe(true)

  const manifest = 'manifest.json'
  const popup = 'popup.html'
  const content = 'content.js'
  const worker = 'service_worker.js'

  const manifestPath = path.join(outDir, manifest)
  const manifestSource = await fs.readJson(manifestPath)

  expect(manifestSource).toMatchObject({
    action: {
      default_popup: popup,
    },
    background: {
      service_worker: worker,
      type: 'module',
    },
    content_scripts: [
      {
        js: [content],
        matches: ['https://a.com/*', 'http://b.com/*'],
      },
    ],
  })

  const contentPath = path.join(outDir, content)
  const contentSource = await fs.readFile(contentPath, 'utf8')
  expect(contentSource).toMatchSnapshot(content)

  const popupPath = path.join(outDir, popup)
  const popupSource = await fs.readFile(popupPath, 'utf8')
  expect(popupSource).toMatchSnapshot(popup)

  const workerPath = path.join(outDir, worker)
  const workerSource = await fs.readFile(workerPath, 'utf8')
  expect(workerSource).toMatch(
    'fetchEvent.respondWith(mapRequestsToLocalhost(url.href))',
  )
})
