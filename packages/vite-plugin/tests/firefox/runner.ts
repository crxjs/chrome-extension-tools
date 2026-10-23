import { createRequire } from 'node:module'
import path from 'node:path'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import type { ChromiumBrowserContext } from 'playwright-chromium'

const require = createRequire(import.meta.url)
const {
  firefox,
}: typeof import('@playwright/test') = require('@playwright/test')
// The harness is pinned to a commit: these low-level APIs let Vitest reuse the
// existing scenarios without migrating them to Playwright Test fixtures.
const harnessDir = path.dirname(
  require.resolve('firefox-webext-playwright-harness'),
)
const {
  ensureFirefoxPatched,
  buildFirefoxLaunchOptions,
  rdpRequest,
  createFirefoxContext,
  cleanupFirefoxContext,
  FirefoxBackgroundPage,
} = require(path.join(harnessDir, 'harness.js'))
const { FirefoxRDPClient } = require(path.join(harnessDir, 'web-ext-rdp.js'))
const { acquireRdpPort } = require(path.join(harnessDir, 'rdp-port.js'))
const { NetworkEventBridge } = require(path.join(
  harnessDir,
  'network-bridge.js',
))
const { wrapWithNetworkBridge } = require(path.join(harnessDir, 'proxies.js'))

interface BackgroundTarget {
  url?: string
  consoleActor?: string
}

interface HarnessContext extends ChromiumBrowserContext {
  _rdpClient: {
    on(event: string, listener: (target: BackgroundTarget) => void): void
    off(event: string, listener: (target: BackgroundTarget) => void): void
  }
  _firefoxBackgroundConsoleActor: string
  _firefoxWebServer: {
    registerRoute(pattern: string, handler: unknown): void
    unregisterRoute(pattern: string, handler: unknown): void
    clearRoutes(): void
  }
}

async function launchFirefoxContext(
  outDir: string,
): Promise<ChromiumBrowserContext> {
  const manifest = JSON.parse(
    await readFile(path.join(outDir, 'manifest.json'), 'utf8'),
  )
  if (!manifest.background) return launchWithoutBackground(outDir)
  const { port, release } = await acquireRdpPort()
  let context: HarnessContext | undefined
  let bridge: { dispose(): void } | undefined
  try {
    const result: { context: HarnessContext } = await createFirefoxContext(
      port,
      outDir,
      {
        playwrightOptions: {
          headless: !process.env.DEBUG,
          launchOptions: { timeout: 15000 },
        },
      },
    )
    const active = result.context
    context = active
    const activeBridge: { dispose(): void } = new NetworkEventBridge(
      active._firefoxWebServer,
    )
    bridge = activeBridge
    let background = new FirefoxBackgroundPage(
      active._rdpClient,
      active._firefoxBackgroundConsoleActor,
    )
    const backgroundUrl: string = await background.evaluate(() => location.href)
    background.url = () => backgroundUrl
    // Runtime reload replaces the RDP console actor as well as the document.
    // Future evaluations must use the replacement; never retry a potentially
    // mutating evaluation that was already sent to the old document.
    const onBackground = (target: BackgroundTarget) => {
      if (target.url !== backgroundUrl || !target.consoleActor) return
      background = new FirefoxBackgroundPage(
        active._rdpClient,
        target.consoleActor,
      )
      background.url = () => backgroundUrl
    }
    active._rdpClient.on('target-available', onBackground)
    const wrapped = wrapWithNetworkBridge(active, activeBridge, {
      onRoute: (pattern: unknown, handler: unknown) => {
        if (typeof pattern === 'string')
          active._firefoxWebServer.registerRoute(pattern, handler)
      },
      onUnroute: (pattern: unknown, handler: unknown) => {
        if (typeof pattern === 'string')
          active._firefoxWebServer.unregisterRoute(pattern, handler)
      },
      onUnrouteAll: () => active._firefoxWebServer.clearRoutes(),
    })
    let closed = false
    return new Proxy(wrapped, {
      get(target, prop) {
        // Firefox's background page provides the same evaluate contract used by
        // these tests. It is not a service worker and cannot test SW lifecycle.
        if (prop === 'serviceWorkers') return () => [background]
        if (prop === 'close')
          return async () => {
            if (closed) return
            closed = true
            try {
              active._rdpClient.off('target-available', onBackground)
              activeBridge.dispose()
              await cleanupFirefoxContext(active)
            } finally {
              await release()
            }
          }
        return Reflect.get(target, prop)
      },
    })
  } catch (error) {
    bridge?.dispose()
    if (context) await cleanupFirefoxContext(context)
    await release()
    throw error
  }
}

// The upstream harness requires a background console actor. Content-script-only
// production fixtures have none: install them with the same web-ext RDP client,
// without inventing a background script in the extension under test.
async function launchWithoutBackground(
  outDir: string,
): Promise<ChromiumBrowserContext> {
  const { port, release } = await acquireRdpPort()
  const profile = await mkdtemp(path.join(tmpdir(), 'crxjs-firefox-profile-'))
  const client = new FirefoxRDPClient()
  let context:
    | Awaited<ReturnType<typeof firefox.launchPersistentContext>>
    | undefined
  let closed = false
  const close = async () => {
    if (closed) return
    closed = true
    client.disconnect()
    try {
      await context?.close()
    } finally {
      await rm(profile, { recursive: true, force: true })
      await release()
    }
  }
  try {
    await ensureFirefoxPatched()
    context = await firefox.launchPersistentContext(
      profile,
      buildFirefoxLaunchOptions(port, {
        headless: !process.env.DEBUG,
        launchOptions: { timeout: 15000 },
      }),
    )
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      await Promise.race([
        client.connect(port),
        new Promise((_, reject) => {
          timer = setTimeout(
            () => reject(new Error('Firefox RDP connection timed out')),
            10000,
          )
        }),
      ])
    } finally {
      clearTimeout(timer)
    }
    const root = await rdpRequest(client, 'getRoot')
    await rdpRequest(client, {
      to: root.addonsActor,
      type: 'installTemporaryAddon',
      addonPath: outDir,
    })
    return new Proxy(context, {
      get(target, prop) {
        if (prop === 'close') return close
        if (prop === 'serviceWorkers') return () => []
        const value = Reflect.get(target, prop, target)
        return typeof value === 'function' ? value.bind(target) : value
      },
    }) as ChromiumBrowserContext
  } catch (error) {
    await close()
    throw error
  }
}

export async function launchFirefox(
  outDir: string,
): Promise<ChromiumBrowserContext> {
  try {
    return await launchFirefoxContext(outDir)
  } catch (error) {
    throw new Error(
      `Firefox setup failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    )
  }
}
