import { jestSetTimeout } from '$test/helpers/timeout'
import fs from 'fs-extra'
import path from 'path'
import {
  chromium,
  ChromiumBrowserContext,
} from 'playwright-chromium'
import { build } from 'vite'
import { getPage } from '../helper-getPage'

jestSetTimeout(30000)

const outDir = path.join(__dirname, 'dist-vite-build')
const dataDirPath = path.join(
  __dirname,
  'chromium-data-dir-build',
)

let browser: ChromiumBrowserContext

beforeAll(async () => {
  await build({
    configFile: path.join(__dirname, 'vite.config.ts'),
    envFile: false,
    build: { outDir },
  })

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
}, 60000)

afterAll(async () => {
  await browser?.close()

  // MV3 service worker is unresponsive if this directory exists from a previous run
  await fs.remove(dataDirPath)
})

test('CRX loads and runs successfully', async () => {
  const options = await getPage(browser, 'chrome-extension')
  const handle = await options.waitForSelector('iframe')
  const iframe = await handle.contentFrame()
  await iframe!.waitForSelector('h1')
})
