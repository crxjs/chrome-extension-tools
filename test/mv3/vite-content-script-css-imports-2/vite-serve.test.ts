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

  const cssFiles = glob.sync(`${outDir}/assets/*.css`, {
    cwd: outDir,
  })
  expect(cssFiles.length).toBe(2)

  const [styles1, styles2] = cssFiles
  const manifest = 'manifest.json'
  const content1 = 'content1/index.js'
  const content2 = 'content2/index.js'

  const manifestPath = path.join(outDir, manifest)
  const manifestSource = await fs.readJson(manifestPath)

  expect(manifestSource).toMatchObject({
    content_scripts: [
      {
        matches: ['http://*/*', 'https://*/*'],
        js: ['content1/index.js'],
        css: [styles1],
      },
      {
        matches: ['http://*/*', 'https://*/*'],
        js: ['content2/index.js'],
        css: [styles2],
      },
    ],
  })

  const content1Path = path.join(outDir, content1)
  const content1Source = await fs.readFile(content1Path, 'utf8')
  expect(content1Source).toMatchSnapshot(content1)

  const content2Path = path.join(outDir, content2)
  const content2Source = await fs.readFile(content2Path, 'utf8')
  expect(content2Source).toMatchSnapshot(content2)

  const styles1Path = path.join(outDir, styles1)
  const styles1Source = await fs.readFile(styles1Path, 'utf8')
  expect(styles1Source).toMatchSnapshot(styles1)

  const styles2Path = path.join(outDir, styles2)
  const styles2Source = await fs.readFile(styles2Path, 'utf8')
  expect(styles2Source).toMatchSnapshot(styles2)
})
