import { fileWriteComplete } from '$src/viteAdaptor'
import fs from 'fs-extra'
import path from 'path'
import { chromium, ChromiumBrowserContext } from 'playwright'
import { createServer, ViteDevServer } from 'vite'

jest.setTimeout(30000)

const timeout = (ms: number, message: string) =>
  new Promise((resolve, reject) => {
    setTimeout(() => reject(new Error(message)), ms)
  })

const outDir = path.join(__dirname, 'dist-vite-serve')
const dataDir = path.join(__dirname, 'chromium-data-dir-serve')

let browserContext: ChromiumBrowserContext
let devServer: ViteDevServer
beforeAll(async () => {
  await fs.remove(outDir)

  devServer = await createServer({
    configFile: path.join(__dirname, 'vite.config.ts'),
    envFile: false,
    build: { outDir },
  })

  await Promise.all([devServer.listen(), fileWriteComplete()])

  browserContext = (await chromium.launchPersistentContext(
    dataDir,
    {
      headless: false,
      slowMo: 100,
      args: [
        `--disable-extensions-except=${outDir}`,
        `--load-extension=${outDir}`,
      ],
    },
  )) as ChromiumBrowserContext
})

afterAll(async () => {
  await browserContext?.close()

  // MV3 service worker is unresponsive if this directory exists from a previous run
  await fs.remove(dataDir)
})

// FIXME: need to add localhost to CSP for vite serve to work
test.skip('Chrome Extension loads and runs successfully', async () => {
  const page = await browserContext.newPage()
  await page.goto('https://google.com')

  await Promise.race([
    page.waitForSelector('text="Content script loaded"'),
    timeout(10000, 'Unable to load Chrome Extension'),
  ])

  await page.waitForSelector('text="Background response"')
  await page.waitForSelector('text="Background OK"')
  await page.waitForSelector('text="Options page OK"')
})
