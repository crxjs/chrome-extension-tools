import path from 'pathe'
import type { ChromiumBrowserContext, Route } from 'playwright-chromium'
import { Subject } from 'rxjs'
import type { RollupWatcher, RollupWatcherEvent } from 'rollup'
import { allFilesSuccess } from 'src/fileWriter-rxjs'
import { afterEach } from 'vitest'
import { build as _build, serve as _serve } from '../runners'

let browser: ChromiumBrowserContext | undefined
let buildWatcher: RollupWatcher | undefined

async function launch(outDir: string): Promise<ChromiumBrowserContext> {
  try {
    await globalThis.browser.launch(outDir)
    return globalThis.browser.context as unknown as ChromiumBrowserContext
  } catch (error) {
    if (process.env.E2E_BROWSER !== 'firefox') throw error
    throw new Error(
      `Firefox setup failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    )
  }
}

afterEach(async () => {
  try {
    await globalThis.browser.close()
  } finally {
    await buildWatcher?.close()
    buildWatcher = undefined
  }
})

export async function build(dirname: string) {
  const { outDir, output } = await _build(dirname)
  if ('on' in output) {
    buildWatcher = output
    // Vite returns a watcher before its first bundle exists. Firefox's RDP
    // installer needs a complete manifest, unlike Chromium's startup loader.
    await new Promise<void>((resolve, reject) => {
      const finish = (error?: unknown) => {
        clearTimeout(timer)
        output.off('event', onEvent)
        if (error) reject(error)
        else resolve()
      }
      const onEvent = (event: RollupWatcherEvent) => {
        if (event.code === 'END') finish()
        if (event.code === 'ERROR') finish(event.error)
      }
      const timer = setTimeout(
        () => finish(new Error('Initial watched build timed out')),
        30000,
      )
      output.on('event', onEvent)
    })
  }

  browser = await launch(outDir)

  await browser.route('https://example.com', async (route) => {
    await route.fulfill({
      path: path.join(__dirname, 'example.html'),
    })
  })

  return { browser, outDir, output }
}

export async function serve(dirname: string) {
  const { outDir, server } = await _serve(dirname, {
    // A retry can observe the previous file-writer success notification.
    // Wait for this server's output to settle before Firefox installs it.
    waitForOutDir: process.env.E2E_BROWSER === 'firefox',
  })

  await allFilesSuccess()

  browser = await launch(outDir)

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
    devServer: server,
    routes: routes.asObservable(),
  }
}
