import { parseManifest } from '$src/files_parseManifest'
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
  const executed = 'executed-script.js'
  const dynamic = 'dynamic-script.js'

  const manifestPath = path.join(outDir, manifest)
  const manifestSource = await fs.readJson(manifestPath)
  expect(manifestSource).toMatchSnapshot(manifest)

  const files = Object.values(parseManifest(manifestSource))
    .flatMap((x) => x)
    .concat([dynamic, executed])

  expect(files).toMatchSnapshot('files')

  for (const file of files) {
    const filepath = path.join(outDir, file)
    const source = await fs.readFile(filepath, 'utf8')

    if (file === 'background.js') {
      expect(
        source.replace(
          /url\.port = JSON\.parse\("\d{4}"\);/,
          'url.port = JSON.parse("3000");',
        ),
      ).toMatchSnapshot(file)
    } else {
      expect(source).toMatchSnapshot(file)
    }
  }
})
