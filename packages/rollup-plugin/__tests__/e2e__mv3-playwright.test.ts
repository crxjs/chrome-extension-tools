import { remove } from 'fs-extra'
import { chromium, ChromiumBrowserContext, Page } from 'playwright-chromium'
import { InputOptions, OutputOptions, rollup } from 'rollup'
import { getExtPath, getTestName, requireExtFile } from '../__fixtures__/utils'

const testName = getTestName(__filename)
const dataDirPath = getExtPath(testName, 'chromium-data-dir')
// __fixtures__/extensions/mv3-playwright/dist
const distDirPath = getExtPath(testName, 'dist')

let browserContext: ChromiumBrowserContext
let page: Page

beforeAll(async () => {
  // Clean up the last build
  await remove(distDirPath)

  const config = requireExtFile(__filename, 'rollup.config.js') as InputOptions & { output: OutputOptions }
  const bundle = await rollup(config)
  await bundle.write(config.output)

  browserContext = (await chromium.launchPersistentContext(dataDirPath, {
    headless: false,
    slowMo: 100,
    args: [`--disable-extensions-except=${distDirPath}`, `--load-extension=${distDirPath}`],
  })) as ChromiumBrowserContext
}, 60000)

afterAll(async () => {
  await browserContext.close()
  // MV3 service worker is unresponsive if this directory exists from a previous run
  await remove(dataDirPath)
})

test('CRX loads and runs successfully', async () => {
  page = await browserContext.newPage()
  await page.goto('https://google.com')

  await page.waitForSelector('text="Content script loaded"')
  await page.waitForSelector('text="Background response"')
  await page.waitForSelector('text="Background OK"')
  await page.waitForSelector('text="Options page OK"')
})
