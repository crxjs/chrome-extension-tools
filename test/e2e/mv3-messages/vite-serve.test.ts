import { filesReady } from '$src/plugin-viteServeFileWriter'
import { timeout } from '$test/helpers/timeout'
import fs from 'fs-extra'
import path from 'path'
import { chromium, ChromiumBrowserContext } from 'playwright'
import { createServer, ViteDevServer } from 'vite'

const timeLimit = (ms: number, message: string) =>
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

  await Promise.all([devServer.listen(), filesReady()])

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

test(
  'MV3 CSP blocks localhost',
  async () => {
    const page = await browserContext.newPage()
    await page.goto('https://google.com')

    // await new Promise(() => {})

    try {
      await Promise.race([
        page.waitForSelector('text="Content script loaded"'),
        timeLimit(10000, 'Unable to load Chrome Extension'),
      ])

      await page.waitForSelector('text="Background response"')
      await page.waitForSelector('text="Background OK"')
      await Promise.race([
        // Chromium Issue: https://bugs.chromium.org/p/chromium/issues/detail?id=1247690
        page.waitForSelector('text="Options page OK"'),
        timeLimit(10000, 'MV3 CSP is still broken'),
      ])
    } catch (error) {
      return
    }

    throw new Error('MV3 CSP is ready!')
  },
  Math.max(25000, timeout),
)
