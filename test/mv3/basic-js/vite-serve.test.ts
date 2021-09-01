import { filesWritten } from '$src/viteAdaptor'
import fs from 'fs-extra'
import path from 'path'
import { createServer, ViteDevServer } from 'vite'

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

  await Promise.all([devServer.listen(2000), filesWritten()])

  expect(fs.existsSync(outDir)).toBe(true)

  const manifest = 'manifest.json'
  const popup = 'popup.html'
  const content = 'content.js'
  const worker = 'service_worker.esm-wrapper.js'

  const manifestPath = path.join(outDir, manifest)
  const manifestSource = await fs.readJson(manifestPath)

  expect(manifestSource).toMatchObject({
    action: {
      default_popup: popup,
    },
    background: {
      service_worker: worker,
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
  expect(contentSource).toBe("console.log('content script')")

  const popupPath = path.join(outDir, popup)
  const popupSource = await fs.readFile(popupPath, 'utf8')
  expect(popupSource).toMatch(
    '<script src="http://localhost:2000/popup.jsx" type="module">',
  )

  const workerPath = path.join(outDir, worker)
  const workerSource = await fs.readFile(workerPath, 'utf8')
  expect(workerSource).toMatch(
    'import "http://localhost:2000/service_worker.js"',
  )
}, 60000)
