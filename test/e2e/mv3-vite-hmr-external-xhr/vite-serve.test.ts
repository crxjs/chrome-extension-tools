import { filesReady } from '$src/plugin-viteServeFileWriter'
import { jestSetTimeout } from '$test/helpers/timeout'
import fs from 'fs-extra'
import path from 'path'
import {
  chromium,
  ChromiumBrowserContext,
  Page,
} from 'playwright-chromium'
import { createServer, ViteDevServer } from 'vite'

jestSetTimeout(30000)

const outDir = path.join(__dirname, 'dist-vite-serve')
const dataDir = path.join(__dirname, 'chromium-data-dir-serve')

let browserContext: ChromiumBrowserContext
let devServer: ViteDevServer
let page: Page
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

test('CRX loads and runs successfully', async () => {
  // creates a mock route handler that returns ok
  // which allows the options page to fetch an "external" resource
  await browserContext.route(
    'http://mock-api-route.test/',
    (route) => {
      route.fulfill({
        status: 200,
        contentType: 'text/plain',
        body: 'ok',
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      })
    },
  )
  page = await browserContext.newPage()
  // we wait for one second for the browser to initialize and the background script's onInstalled handler to fire and open the options page
  await page.waitForTimeout(1000)
  const pages = await browserContext.pages()
  // to test for text on the options page, we need to find the newly opened extension page that was opened by the background script on install
  const optionsPage = pages.find((p) =>
    p.url().includes('chrome-extension://'),
  )
  if (optionsPage) {
    // we need to reload the options page, because many times on initial load, the bundler has not finished and we're returned a blank options page with no content
    // this might be something to improve later, since in theory we're checking for files ready, but that doesn't always happen. forcing a reload seems to make it work consistently
    await optionsPage.reload()
    await optionsPage.waitForSelector('text=external XHR: Yes')
  } else {
    throw new Error('Options page was not opened')
  }
})
