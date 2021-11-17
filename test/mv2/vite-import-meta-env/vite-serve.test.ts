/* eslint-disable quotes */
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

  {
    const contentPath = path.join(outDir, 'with-0-imports.js')
    const contentSource = await fs.readFile(contentPath, 'utf8')
    expect(contentSource).toMatch('let __importMetaEnv;')
    expect(contentSource).toMatch('__importMetaEnv =')
    expect(contentSource).toMatch('"VITE_ENV_A":"a"')
    expect(contentSource).toMatch('__importMetaEnv.VITE_ENV_A')
  }

  {
    const contentPath = path.join(outDir, 'with-1-imports.js')
    const contentSource = await fs.readFile(contentPath, 'utf8')
    expect(contentSource).toMatch('let __importMetaEnv;')
    expect(contentSource).toMatch('__importMetaEnv =')
    expect(contentSource).toMatch('"VITE_ENV_A":"a"')
    expect(contentSource).toMatch('__importMetaEnv.VITE_ENV_A')
  }

  {
    const contentPath = path.join(outDir, 'with-2-imports.js')
    const contentSource = await fs.readFile(contentPath, 'utf8')
    expect(contentSource).toMatch('let __importMetaEnv;')
    expect(contentSource).toMatch('__importMetaEnv =')
    expect(contentSource).toMatch('"VITE_ENV_A":"a"')
    expect(contentSource).toMatch('__importMetaEnv.VITE_ENV_A')
    expect(contentSource).toMatch('"VITE_ENV_C":"c"')
    expect(contentSource).toMatch('__importMetaEnv.VITE_ENV_C')
  }
})
