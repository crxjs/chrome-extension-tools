import fs from 'fs-extra'
import path from 'path'
import {
  chromium,
  ChromiumBrowserContext,
  Page,
} from 'playwright'
import { build } from 'vite'

jest.spyOn(console, 'log').mockImplementation(jest.fn())

const dataDirPath = path.join(__dirname, 'chromium-data-dir')
const distDirPath = path.join(__dirname, 'dist')

let browserContext: ChromiumBrowserContext
let page: Page

beforeAll(async () => {
  await build({
    configFile: path.join(__dirname, 'vite.config.ts'),
    envFile: false,
  })

  browserContext = (await chromium.launchPersistentContext(
    dataDirPath,
    {
      headless: false,
      slowMo: 100,
      args: [
        `--disable-extensions-except=${distDirPath}`,
        `--load-extension=${distDirPath}`,
      ],
    },
  )) as ChromiumBrowserContext
}, 60000)

afterAll(async () => {
  await browserContext.close()
  // MV3 service worker is unresponsive if this directory exists from a previous run
  await fs.remove(dataDirPath)
})

test('CRX loads and runs successfully', async () => {
  page = await browserContext.newPage()
  await page.goto('https://google.com')

  await page.waitForSelector('text="Content script loaded"')
  await page.waitForSelector('text="Background response"')
  await page.waitForSelector('text="Background OK"')
  await page.waitForSelector('text="Options page OK"')
})
