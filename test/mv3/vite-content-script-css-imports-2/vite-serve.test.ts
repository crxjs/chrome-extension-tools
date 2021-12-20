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

  const content1 = 'content1/index.js'
  const content2 = 'content2/index.js'
  const manifest = 'manifest.json'
  const styles1 = 'assets/index-5f7d7b6f.css'
  const styles2 = 'assets/index-5dfee6cc.css'

  const content1Path = path.join(outDir, content1)
  const content1Source = await fs.readFile(content1Path, 'utf8')
  expect(content1Source).toMatchSnapshot()

  const content2Path = path.join(outDir, content2)
  const content2Source = await fs.readFile(content2Path, 'utf8')
  expect(content2Source).toMatchSnapshot()

  const styles1Path = path.join(outDir, styles1)
  const styles1Source = await fs.readFile(styles1Path, 'utf8')
  expect(styles1Source).toMatchSnapshot()

  const styles2Path = path.join(outDir, styles2)
  const styles2Source = await fs.readFile(styles2Path, 'utf8')
  expect(styles2Source).toMatchSnapshot()

  const manifestPath = path.join(outDir, manifest)
  const manifestSource = await fs.readJson(manifestPath)
  expect(manifestSource).toMatchObject({
    content_scripts: [
      {
        css: [styles1],
        js: [runtimeReloaderCS, content1],
        matches: ['http://*/*', 'https://*/*'],
      },
      {
        css: [styles2],
        js: [runtimeReloaderCS, content2],
        matches: ['http://*/*', 'https://*/*'],
      },
    ],
  })
})
