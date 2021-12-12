import { swWrapperName } from '$src/plugin-backgroundESM_MV3'
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
  const worker = 'background/sw.js'

  const manifestPath = path.join(outDir, manifest)
  const manifestSource = await fs.readJson(manifestPath)

  expect(manifestSource).toMatchObject({
    background: {
      service_worker: swWrapperName,
      type: 'module',
    },
  })

  const workerPath = path.join(outDir, worker)
  const workerSource = await fs.readFile(workerPath, 'utf8')
  expect(workerSource).toMatch(
    'fetchEvent.respondWith(mapRequestsToLocalhost(url.href))',
  )

  const wrapperPath = path.join(outDir, swWrapperName)
  const wrapperSource = await fs.readFile(wrapperPath, 'utf8')
  expect(wrapperSource).toMatch(`import './${worker}'`)
})
