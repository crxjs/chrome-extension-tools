import { filesWritten } from '$src/viteAdaptor'
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

  await Promise.all([devServer.listen(2000), filesWritten()])

  expect(fs.existsSync(distDir)).toBe(true)

  const manifest = 'manifest.json'
  const popup = 'popup.html'
  const content = 'content.esm-wrapper.js'

  const manifestPath = path.join(distDir, manifest)
  const manifestSource = await fs.readJson(manifestPath)
  expect(manifestSource).toMatchObject({
    action: {
      default_popup: 'popup.html',
    },
    background: {
      service_worker: 'service_worker.js',
    },
    content_scripts: [
      {
        js: ['content.esm-wrapper.js'],
        matches: ['https://a.com/*', 'http://b.com/*'],
      },
    ],
    web_accessible_resources: [
      {
        resources: ['chunks/*-*.js', 'content.js'],
        matches: [
          'https://a.com/*',
          'http://b.com/*',
          'https://c.com/*',
        ],
      },
    ],
  })

  const contentPath = path.join(distDir, content)
  const contentSource = await fs.readFile(contentPath, 'utf8')
  expect(contentSource).toMatch(
    '"http://localhost:2000/content.js"',
  )

  const popupPath = path.join(distDir, popup)
  const popupSource = await fs.readFile(popupPath, 'utf8')
  expect(popupSource).toMatch(
    '<script src="http://localhost:2000/popup.jsx" type="module">',
  )
}, 60000)
