import {
  filesReady,
  stopFileWriter,
} from '$src/plugin-viteServeFileWriter'
import { jestSetTimeout } from '$test/helpers/timeout'
import fs from 'fs-extra'
import path from 'path'
import {
  chromium,
  ChromiumBrowserContext,
} from 'playwright-chromium'
import { createServer, ViteDevServer } from 'vite'
import { getPage } from '../helper-getPage'

jestSetTimeout(15000)

const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms))

const outDir = path.join(__dirname, 'dist-vite-serve')
const dataDir = path.join(__dirname, 'chromium-data-dir-serve')

let browser: ChromiumBrowserContext
let devServer: ViteDevServer
beforeAll(async () => {
  await fs.remove(outDir)

  devServer = await createServer({
    configFile: path.join(__dirname, 'vite.config.ts'),
    envFile: false,
    build: { outDir },
  })

  await Promise.all([devServer.listen(), filesReady()])

  await delay(1000)

  browser = (await chromium.launchPersistentContext(dataDir, {
    headless: false,
    slowMo: 100,
    args: [
      `--disable-extensions-except=${outDir}`,
      `--load-extension=${outDir}`,
    ],
  })) as ChromiumBrowserContext
})

afterAll(async () => {
  await browser?.close()
  stopFileWriter()
  await devServer.close()

  // MV3 service worker is unresponsive if this directory exists from a previous run
  await fs.remove(dataDir)
})

test('CRX loads and runs successfully', async () => {
  const options = await getPage(browser, 'chrome-extension')
  const handle = await options.waitForSelector('iframe')
  const iframe = await handle.contentFrame()
  await iframe!.waitForSelector('h1')
})
