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

test('writes files to disk', async () => {
  expect(fs.existsSync(outDir)).toBe(false)

  await Promise.all([devServer.listen(), filesReady()])

  expect(fs.existsSync(outDir)).toBe(true)

  const manifest = 'manifest.json'
  const background = 'background.js'
  const content = 'content.js'
  const executed = 'executed-script.js'
  const dynamic = 'dynamic-script.js'

  const manifestPath = path.join(outDir, manifest)
  const manifestSource = await fs.readJson(manifestPath)
  expect(manifestSource).toMatchObject({
    background: {
      service_worker: 'background.js',
    },
    content_scripts: [
      {
        js: [
          'runtime-reloader--content-script.js',
          'content.js',
        ],
        matches: ['https://*/*', 'http://*/*'],
      },
    ],
    manifest_version: 3,
  })

  const bgPath = path.join(outDir, background)
  expect(fs.existsSync(bgPath)).toBe(true)

  const csPath = path.join(outDir, content)
  const csSource = await fs.readFile(csPath, 'utf8')
  expect(csSource).toMatchSnapshot(content)

  const dcsPath = path.join(outDir, dynamic)
  const dcsSource = await fs.readFile(dcsPath, 'utf8')
  expect(dcsSource).toMatchSnapshot(dynamic)

  const xcsPath = path.join(outDir, executed)
  const xcsSource = await fs.readFile(xcsPath, 'utf8')
  expect(xcsSource).toMatchSnapshot(executed)
})
