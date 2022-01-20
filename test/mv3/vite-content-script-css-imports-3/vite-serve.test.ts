import { ManifestV3 } from '$src'
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
  const styles3 = 'assets/import-3b031dc7.css'
  const wrapper1 = 'assets/index.esm-wrapper-72fbbdd0.js'
  const wrapper2 = 'assets/index.esm-wrapper-600ffb76.js'

  const content1Path = path.join(outDir, content1)
  const content1Source = await fs.readFile(content1Path, 'utf8')
  expect(content1Source).toMatchSnapshot(content2)

  const content2Path = path.join(outDir, content2)
  const content2Source = await fs.readFile(content2Path, 'utf8')
  expect(content2Source).toMatchSnapshot(content2)

  const styles1Path = path.join(outDir, styles1)
  const styles1Source = await fs.readFile(styles1Path, 'utf8')
  expect(styles1Source).toMatchSnapshot(styles1)

  const styles2Path = path.join(outDir, styles2)
  const styles2Source = await fs.readFile(styles2Path, 'utf8')
  expect(styles2Source).toMatchSnapshot(styles2)

  const styles3Path = path.join(outDir, styles3)
  const styles3Source = await fs.readFile(styles3Path, 'utf8')
  expect(styles3Source).toMatchSnapshot(styles3)

  const wrapper1Path = path.join(outDir, wrapper1)
  const wrapper1Source = await fs.readFile(wrapper1Path, 'utf8')
  expect(wrapper1Source).toMatchSnapshot(wrapper1)

  const wrapper2Path = path.join(outDir, wrapper2)
  const wrapper2Source = await fs.readFile(wrapper2Path, 'utf8')
  expect(wrapper2Source).toMatchSnapshot(wrapper2)

  const manifestPath = path.join(outDir, manifest)
  const manifestSource: ManifestV3 = await fs.readJson(
    manifestPath,
  )
  expect(manifestSource).toMatchSnapshot(manifest)
})
