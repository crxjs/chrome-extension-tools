import path from 'path'
import { chromium, ChromiumBrowserContext } from 'playwright-chromium'
import { allFilesSuccess } from 'src/fileWriter-utilities'
import { ViteDevServer } from 'vite'
import { afterAll } from 'vitest'
import { build as _build, serve as _serve } from '../runners'

let browser: ChromiumBrowserContext | undefined
let server: ViteDevServer | undefined

afterAll(async () => {
  await browser?.close()
  await server?.close()
})

export async function build(dirname: string) {
  const { outDir, config } = await _build(dirname)

  const dataDir = path.join(config.cacheDir!, '.chromium')
  browser = (await chromium.launchPersistentContext(dataDir, {
    headless: false,
    slowMo: 100,
    args: [
      `--disable-extensions-except=${outDir}`,
      `--load-extension=${outDir}`,
    ],
  })) as ChromiumBrowserContext

  await browser.route('https://example.com', (route) => {
    route.fulfill({
      path: path.join(__dirname, 'example.html'),
    })
  })

  return { browser, outDir, dataDir }
}

export async function serve(dirname: string) {
  const { outDir, server: s, config } = await _serve(dirname)
  server = s

  await allFilesSuccess()

  const dataDir = path.join(config.cacheDir!, '.chromium')
  browser = (await chromium.launchPersistentContext(dataDir, {
    headless: false,
    slowMo: 100,
    args: [
      `--disable-extensions-except=${outDir}`,
      `--load-extension=${outDir}`,
    ],
  })) as ChromiumBrowserContext

  await browser.route('https://example.com', (route) => {
    route.fulfill({
      path: path.join(__dirname, 'example.html'),
    })
  })

  await browser
    .pages()
    .find((p) => p.url() === 'about:blank')
    ?.goto('chrome://extensions')

  return { browser, outDir, dataDir, devServer: server }
}
