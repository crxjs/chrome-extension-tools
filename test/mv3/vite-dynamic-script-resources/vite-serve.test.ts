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

  const content1 = 'content1.js'
  const content2 = 'content2.js'
  const script = 'script.js'
  const font = 'assets/font.bb6bc8d6.otf'
  const html = 'iframe.html'
  const image = 'assets/image.51f8fe9d.png'
  const manifest = 'manifest.json'

  const content1Path = path.join(outDir, content1)
  const content1Source = await fs.readFile(content1Path, 'utf8')
  expect(content1Source).toMatchSnapshot(content1)

  const content2Path = path.join(outDir, content2)
  const content2Source = await fs.readFile(content2Path, 'utf8')
  expect(content2Source).toMatchSnapshot(content2)

  const scriptPath = path.join(outDir, script)
  const scriptSource = await fs.readFile(scriptPath, 'utf8')
  expect(scriptSource).toMatchSnapshot(script)

  const htmlPath = path.join(outDir, html)
  const htmlSource = await fs.readFile(htmlPath, 'utf8')
  expect(htmlSource).toMatchSnapshot(html)

  const fontPath = path.join(outDir, font)
  expect(fs.existsSync(fontPath)).toBe(true)

  const imagePath = path.join(outDir, image)
  expect(fs.existsSync(imagePath)).toBe(true)

  const manifestPath = path.join(outDir, manifest)
  const manifestSource = await fs.readJson(manifestPath)
  expect(manifestSource).toMatchObject({
    web_accessible_resources: [
      {
        matches: [
          'https://google.com/*',
          'https://github.com/*',
        ],
        resources: [image, script, font, html],
      },
    ],
  })
})
