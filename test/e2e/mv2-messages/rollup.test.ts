import { remove } from 'fs-extra'
import path from 'path'
import {
  chromium,
  ChromiumBrowserContext,
  Page,
} from 'playwright'
import { OutputOptions, rollup, RollupOptions } from 'rollup'
import config, { outDir } from './rollup.config'

const dataDirPath = path.join(
  __dirname,
  'chromium-data-dir-rollup',
)

let browserContext: ChromiumBrowserContext
let page: Page

beforeAll(async () => {
  // Clean up the last build
  await remove(outDir)

  const bundle = await rollup(config as RollupOptions)
  await bundle.write(config.output as OutputOptions)

  browserContext = (await chromium.launchPersistentContext(
    dataDirPath,
    {
      headless: false,
      slowMo: 100,
      args: [
        `--disable-extensions-except=${outDir}`,
        `--load-extension=${outDir}`,
      ],
    },
  )) as ChromiumBrowserContext
}, 60000)

afterAll(async () => {
  await browserContext.close()
  // MV3 service worker is unresponsive if this directory exists from a previous run
  await remove(dataDirPath)
})

test('CRX loads and runs successfully', async () => {
  page = await browserContext.newPage()
  await page.goto('https://google.com')

  // await forever

  await page.waitForSelector('text="Content script loaded"')
  await page.waitForSelector('text="Background response"')
  await page.waitForSelector('text="Background OK"')
  await page.waitForSelector('text="Options page OK"')
}, 600000)
