import fs from 'fs-extra'
import path from 'pathe'
import { chromium, ChromiumBrowserContext, Route } from 'playwright-chromium'
import { Subject } from 'rxjs'
import { allFilesSuccess } from 'src/fileWriter-rxjs'
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
const useProfileTemplate = typeof process.env.DEBUG === 'undefined'
// Copying a warmed empty profile keeps each test isolated without paying
// Chromium's first-run profile initialization cost for every fixture.
let browserProfileTemplateDir: string | undefined
if (useProfileTemplate) {
  createBrowserProfileTemplate()
    .then((dir) => {
      browserProfileTemplateDir = dir
    })
    .catch(() => undefined)
}

afterEach(async () => {
  await browser?.close()
})

async function createBrowserProfileTemplate(): Promise<string> {
  const dataDir = path.join(__dirname, '.vite', 'chromium-profile-template')
  if (await fs.pathExists(path.join(dataDir, 'Default'))) return dataDir

  await fs.remove(dataDir)
  await fs.ensureDir(dataDir)

  const template = (await chromium.launchPersistentContext(dataDir, {
    headless: false,
    args: ['--headless=new'],
  })) as ChromiumBrowserContext
  await template.close()

  return dataDir
}

async function prepareBrowserProfile(dataDir: string) {
  await fs.remove(dataDir)
  if (!browserProfileTemplateDir) {
    await fs.ensureDir(dataDir)
    return
  }

  await fs.copy(browserProfileTemplateDir, dataDir, {
    filter: (src) => {
      const name = path.basename(src)
      return !name.startsWith('Singleton') && name !== 'DevToolsActivePort'
    },
  })
}

export async function build(dirname: string) {
  const { outDir, config, output } = await _build(dirname)

  const dataDir = path.join(config.cacheDir!, '.chromium')
  await prepareBrowserProfile(dataDir)
  browser = (await chromium.launchPersistentContext(dataDir, {
    headless: false,
    slowMo: process.env.DEBUG ? 100 : undefined,
    args: chromiumArgs(outDir),
  })) as ChromiumBrowserContext

  await browser.route('https://example.com', async (route) => {
    await route.fulfill({
      path: path.join(__dirname, 'example.html'),
    })
  })

  return { browser, outDir, dataDir, output }
}

export async function serve(dirname: string) {
  const { outDir, server, config } = await _serve(dirname)

  await allFilesSuccess()

  const dataDir = path.join(config.cacheDir!, '.chromium')
  await prepareBrowserProfile(dataDir)
  browser = (await chromium.launchPersistentContext(dataDir, {
    headless: false,
    slowMo: process.env.DEBUG ? 100 : undefined,
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
