import { fileWriteComplete } from '$src/viteAdaptor'
import { jestSetTimeout, timeLimit } from '$test/helpers/timeout'
import fs from 'fs-extra'
import path from 'path'
import { chromium, ChromiumBrowserContext } from 'playwright'
import { createServer, ViteDevServer } from 'vite'

process.chdir(__dirname)

jestSetTimeout(30000)

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

  const crxDash = await browserContext.newPage()
  crxDash.goto('chrome://extensions')
})

afterAll(async () => {
  await browserContext?.close()

  // MV3 service worker is unresponsive if this directory exists from a previous run
  await fs.remove(dataDir)
})

// FIXME: need to add localhost to CSP for vite serve to work
test('Chrome Extension loads and runs successfully', async () => {
  const page = await browserContext.newPage()
  await page.goto('https://google.com')

  await Promise.race([
    page.waitForSelector('text="Content script loaded"'),
    timeLimit(10000, 'Unable to load Chrome Extension'),
  ])

  await page.waitForSelector('text="Background response"')
  await page.waitForSelector('text="Background OK"')
  await page.waitForSelector('text="Options page OK"')
})
