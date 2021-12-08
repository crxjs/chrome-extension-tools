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
  const devtools = 'devtools.html'
  const test1 = 'test1.html'
  const test2 = 'test2.html'

  const manifestPath = path.join(outDir, manifest)
  const manifestSource = await fs.readJson(manifestPath)

  expect(manifestSource).toMatchObject({
    devtools_page: devtools,
  })

  const devtoolsPath = path.join(outDir, devtools)
  const devtoolsSource = await fs.readFile(devtoolsPath, 'utf8')
  expect(devtoolsSource).toMatchSnapshot(devtools)

  const test1Path = path.join(outDir, test1)
  const test1Source = await fs.readFile(test1Path, 'utf8')
  expect(test1Source).toMatchSnapshot(test1)

  const test2Path = path.join(outDir, test2)
  const test2Source = await fs.readFile(test2Path, 'utf8')
  expect(test2Source).toMatchSnapshot(test2)
})
