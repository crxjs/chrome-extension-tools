import fs from 'fs-extra'
import path from 'pathe'
import { chromium, ChromiumBrowserContext, Route } from 'playwright-chromium'
import { Subject } from 'rxjs'
import { allFilesSuccess } from 'src/fileWriter-rxjs'
import { ViteDevServer } from 'vite'
import { afterEach } from 'vitest'
import { build as _build, serve as _serve } from '../runners'

const chromiumArgs = (outDir: string) => {
  const args = [
    `--disable-extensions-except=${outDir}`,
    `--load-extension=${outDir}`,
    '--disable-features=ExtensionDisableUnsupportedDeveloper',
  ]
  // run headless if not in debug mode
  if (typeof process.env.DEBUG === 'undefined') args.unshift(`--headless=new`)
  return args
}

let browser: ChromiumBrowserContext | undefined

afterEach(async () => {
  await browser?.close()
})

export async function build(dirname: string) {
  const { outDir, config } = await _build(dirname)

  const dataDir = path.join(config.cacheDir!, '.chromium')
  await fs.remove(dataDir);
  browser = (await chromium.launchPersistentContext(dataDir, {
    headless: false,
    slowMo: 100,
    args: chromiumArgs(outDir),
  })) as ChromiumBrowserContext

  await browser.route('https://example.com', async (route) => {
    await route.fulfill({
      path: path.join(__dirname, 'example.html'),
    })
  })

  return { browser, outDir, dataDir }
}

export async function serve(dirname: string) {
  const { outDir, server, config } = await _serve(dirname)

  await allFilesSuccess()

  const dataDir = path.join(config.cacheDir!, '.chromium')
  await fs.rm(dataDir, { recursive: true, force: true, maxRetries: 5 });
  browser = (await chromium.launchPersistentContext(dataDir, {
    headless: false,
    slowMo: 100,
    args: chromiumArgs(outDir),
  })) as ChromiumBrowserContext

  const routes = new Subject<Route>()
  await browser.route('https://example.com', async (route) => {
    await route.fulfill({
      path: path.join(__dirname, 'example.html'),
    })
    routes.next(route)
  })

  return {
    browser,
    outDir,
    dataDir,
    devServer: server,
    routes: routes.asObservable(),
  }
}
