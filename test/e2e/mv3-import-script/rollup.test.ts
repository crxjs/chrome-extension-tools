import { jestSetTimeout } from '$test/helpers/timeout'
import { remove } from 'fs-extra'
import path from 'path'
import {
  chromium,
  ChromiumBrowserContext,
} from 'playwright-chromium'
import { OutputOptions, rollup, RollupOptions } from 'rollup'
import { getPage } from '../helper-getPage'
import config, { outDir } from './rollup.config'

jestSetTimeout(30000)

process.chdir(__dirname)

const dataDirPath = path.join(
  __dirname,
  'chromium-data-dir-rollup',
)

let browser: ChromiumBrowserContext

beforeAll(async () => {
  // Clean up the last build
  await remove(outDir)

  const bundle = await rollup(config as RollupOptions)
  await bundle.write(config.output as OutputOptions)

  browser = (await chromium.launchPersistentContext(
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
})

afterAll(async () => {
  await browser.close()
  // MV3 service worker is unresponsive if this directory exists from a previous run
  await remove(dataDirPath)
})

test('CRX loads and runs successfully', async () => {
  const options = await getPage(browser, 'chrome-extension')
  const google = await getPage(browser, 'google')

  await options.waitForSelector('.ok', { timeout: 10000 })
  await google.waitForSelector('.ok', { timeout: 10000 })
})
