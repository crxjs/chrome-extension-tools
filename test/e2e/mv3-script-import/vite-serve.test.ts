import {
  filesReady,
  stopFileWriter,
} from '$src/plugin-viteServeFileWriter'
import forever from '$test/helpers/forever'
import { jestSetTimeout } from '$test/helpers/timeout'
import fs from 'fs-extra'
import path from 'path'
import {
  chromium,
  ChromiumBrowserContext,
  Page,
} from 'playwright-chromium'
import { createServer, ViteDevServer } from 'vite'

jestSetTimeout(15000)

const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms))

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

  await delay(1000)

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
  stopFileWriter()
  await devServer.close()

  // MV3 service worker is unresponsive if this directory exists from a previous run
  await fs.remove(dataDir)
})

test('CRX loads and runs successfully', async () => {
  async function getPage(included: string) {
    let count = 0
    let page: Page | undefined
    while (!page && count < 5) {
      page = browserContext
        .pages()
        .find((p) => p.url().includes(included))
      if (!page) await new Promise((r) => setTimeout(r, 100))
      count++
    }
    return page
  }

  const options = await getPage('chrome-extension')
  let google = await getPage('google')
  if (!google) {
    await options?.reload()
    google = await getPage('google')
  }

  await options!.waitForSelector('.ok', { timeout: 10000 })
  // await google.waitForSelector('.ok', { timeout: 10000 })
})
