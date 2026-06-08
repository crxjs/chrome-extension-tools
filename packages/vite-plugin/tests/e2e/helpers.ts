import jsesc from 'jsesc'
import { BrowserContext, Locator, Page, Worker } from 'playwright-chromium'
import { basename, join, resolve } from 'src/path'
import { TestContext } from 'vitest'
import fs from 'fs-extra'

let count = 0
export function getCustomId({ meta }: TestContext): string {
  const filename = meta.file?.name
  if (!filename) throw new TypeError('Test context filename is undefined')
  return `${basename(filename, '.test.ts')}-${count++}`
}

export async function getPage(
  browser: BrowserContext,
  test: RegExp | string,
): Promise<Page> {
  const timeout =
    process.env.NODE_ENV === 'test' && process.env.TIMEOUT
      ? parseInt(process.env.TIMEOUT)
      : 5000
  const regex = test instanceof RegExp ? test : new RegExp(jsesc(test))
  const waitForUrl = async (p: Page): Promise<boolean> => {
    try {
      await p.waitForURL(regex, { timeout })
      return true
    } catch (error) {
      // never resolve if page closes, etc
      return new Promise(() => undefined)
    }
  }
  const page = await Promise.race([
    browser.waitForEvent('page', {
      predicate: async (p) => {
        await waitForUrl(p)
        return true
      },
      timeout,
    }),
    ...browser.pages().map(async (p) => {
      await waitForUrl(p)
      return p
    }),
  ])

  return page
}

/** WaitForFunction uses eval, which doesn't work for CRX (chrome csp issues) */
export async function waitForInnerHtml(
  locator: Locator,
  pred: (html: string) => boolean = () => true,
) {
  let count = 0
  while (count < 300) {
    const n = await locator.count()
    for (let i = 0; i < n; ++i) {
      const item = locator.nth(i)
      const html = await item.innerHTML()
      if (pred(html)) return item
    }

    count++
    await new Promise((r) => setTimeout(r, 100))
  }
  throw new Error('could not find element')
}

export const ensureViteHMRWillPickupChangedFiled = async (
  filesToModify: string[],
) => {
  const now = new Date()
  for (const f of filesToModify) {
    // Add a newline to trigger change detection
    await fs.appendFile(f, '\n')

    await fs.utimes(f, now, now)

    // Remove the last line
    const content = await fs.readFile(f, 'utf8')
    const lines = content.split('\n')
    if (lines.length > 0 && lines[lines.length - 1] === '') {
      lines.pop()
      await fs.writeFile(f, lines.join('\n'))
    }
  }
}

export const ensureViteHmrSeesChangedFiles =
  ensureViteHMRWillPickupChangedFiled

export const createUpdate =
  ({
    target,
    src,
    plugins = [],
  }: {
    target: string
    src: string
    plugins?: (() => Promise<void>)[]
  }) =>
  async (includes: string, srcDir = src) => {
    const updatedFiles: string[] = []
    await Promise.all([
      ...plugins.map((p) => p()),
      fs.copy(srcDir, target, {
        recursive: true,
        overwrite: true,
        filter: (f) => {
          if (fs.lstatSync(f).isDirectory()) return true
          const base = basename(f)
          const willCopy = base.endsWith(includes)
          if (willCopy) {
            updatedFiles.push(join(target, resolve(f).replace(srcDir, '')))
          }
          return willCopy
        },
      }),
    ])

    if (process.platform === 'win32') {
      await ensureViteHMRWillPickupChangedFiled(updatedFiles)
    }
  }


/**
 * Returns the extension's MV3 background service worker. If one is already
 * attached to the context it is returned immediately; otherwise this waits
 * for one to spawn (up to `timeout` ms) and returns `undefined` on timeout.
 */
export async function getServiceWorker(
  browser: BrowserContext,
  { timeout = 500 }: { timeout?: number } = {},
): Promise<Worker | undefined> {
  const existing = browser.serviceWorkers()[0]
  if (existing) return existing
  try {
    return await browser.waitForEvent('serviceworker', { timeout })
  } catch {
    return undefined
  }
}

/**
 * Wait until the MV3 background service worker has registered the given
 * dynamic content script IDs via `chrome.scripting.registerContentScripts`.
 *
 * Polls from the outside so it tolerates: SW not spawned yet, SW JS global
 * present before `chrome.*` bindings land, and SW restarts mid-evaluate.
 */
export async function waitForRegisteredContentScripts(
  browser: BrowserContext,
  expectedIds: string[],
  { timeout = 15000, interval = 100 }: { timeout?: number; interval?: number } = {},
): Promise<void> {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    const sw = await getServiceWorker(browser)
    if (sw) {
      try {
        const ids: string[] = await sw.evaluate(async () => {
          if (typeof chrome === 'undefined' || !chrome.scripting) return []
          const r = await chrome.scripting.getRegisteredContentScripts()
          return r.map((s) => s.id)
        })
        if (expectedIds.every((id) => ids.includes(id))) return
      } catch { /* SW restarted mid-evaluate — loop and retry */ }
    }
    await new Promise((r) => setTimeout(r, interval))
  }
  throw new Error(
    `Timed out after ${timeout}ms waiting for content scripts to register: ${expectedIds.join(', ')}`,
  )
}

/**
 * Wait until the IIFE bundle for a registered content script has been rebuilt
 * to contain `needle`. Discovers the on-disk filename by asking the SW which
 * `js` paths are currently registered for `scriptId`, then polls those files
 * under `outDir` until one matches.
 *
 * Use this instead of a fixed sleep after editing a source file: the HMR plugin
 * only signals runtime-reload once the IIFE rebuild promise resolves, so the
 * output file's content is the most direct "rebuild finished" signal.
 */
export async function waitForContentScriptContent(
  browser: BrowserContext,
  outDir: string,
  scriptId: string,
  needle: string,
  { timeout = 15000, interval = 100 }: { timeout?: number; interval?: number } = {},
): Promise<void> {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    const sw = await getServiceWorker(browser)
    if (sw) {
      try {
        const jsPaths: string[] = await sw.evaluate(async (id) => {
          if (typeof chrome === 'undefined' || !chrome.scripting) return []
          const r = await chrome.scripting.getRegisteredContentScripts({ ids: [id] })
          return r.flatMap((s) => s.js ?? [])
        }, scriptId)
        for (const p of jsPaths) {
          const file = join(outDir, p.replace(/^\//, ''))
          try {
            const content = await fs.readFile(file, 'utf8')
            if (content.includes(needle)) return
          } catch { /* file may not exist mid-rebuild */ }
        }
      } catch { /* SW restarted mid-evaluate — loop and retry */ }
    }
    await new Promise((r) => setTimeout(r, interval))
  }
  throw new Error(
    `Timed out after ${timeout}ms waiting for "${needle}" in content script bundle for "${scriptId}"`,
  )
}
