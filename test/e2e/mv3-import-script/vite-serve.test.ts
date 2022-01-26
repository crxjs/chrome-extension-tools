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

jestSetTimeout(60000)

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
  const options1 = await getPage(browser, 'chrome-extension')
  const google1 = await getPage(browser, 'google')

  const branch = await Promise.race([
    // it might work the first time
    options1.waitForSelector('.ok').then(() => 0),
    // crx may reload b/c imported script has changed the manifest
    options1.waitForEvent('close').then(() => 1),
  ])

  if (branch === 0) {
    await google1.waitForSelector('.ok')
  } else {
    // options page will open again when crx reloads
    const options2 = await getPage(browser, 'chrome-extension')

    // close the old google window
    await google1.close()

    // we want the new google window with the new content script
    const google2 = await getPage(browser, 'google')
    await google2.waitForSelector('.ok')

    await options2.waitForSelector('.ok')
  }
})
