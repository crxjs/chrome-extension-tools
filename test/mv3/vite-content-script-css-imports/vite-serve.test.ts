import { runtimeReloaderCS } from '$src/plugin-runtimeReloader'
import { filesReady } from '$src/plugin-viteServeFileWriter'
import { jestSetTimeout } from '$test/helpers/timeout'
import fs from 'fs-extra'
import glob from 'glob'
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

  const styles = 'assets/content-89281590.css'
  const manifest = 'manifest.json'
  const content = 'content.js'

  const contentPath = path.join(outDir, content)
  const contentSource = await fs.readFile(contentPath, 'utf8')
  expect(contentSource).toMatchSnapshot(content)

  const stylesPath = path.join(outDir, styles)
  const stylesSource = await fs.readFile(stylesPath, 'utf8')
  expect(stylesSource).toMatchSnapshot(styles)

  const manifestPath = path.join(outDir, manifest)
  const manifestSource = await fs.readJson(manifestPath)
  expect(manifestSource).toMatchObject({
    content_scripts: [
      {
        css: [styles],
        js: [runtimeReloaderCS, 'content.js'],
        matches: ['http://*/*', 'https://*/*'],
      },
    ],
  })
})
