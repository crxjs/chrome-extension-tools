import path from 'path'
import { chromium, ChromiumBrowserContext } from 'playwright-chromium'
import { filesReady } from 'src/plugin-fileWriter--events'
import { ViteDevServer } from 'vite'
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

  return { browser, outDir, dataDir }
}

export async function serve(dirname: string) {
  const { outDir, server: s, config } = await _serve(dirname)
  server = s

  await filesReady()

  const dataDir = path.join(config.cacheDir!, '.chromium')
  browser = (await chromium.launchPersistentContext(dataDir, {
    headless: false,
    slowMo: 100,
    args: [
      `--disable-extensions-except=${outDir}`,
      `--load-extension=${outDir}`,
    ],
  })) as ChromiumBrowserContext

  await browser
    .pages()
    .find((p) => p.url() === 'about:blank')
    ?.goto('chrome://extensions')

  return { browser, outDir, dataDir, devServer: server }
}
