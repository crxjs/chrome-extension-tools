import jsesc from 'jsesc'
import { BrowserContext, Locator, Page } from 'playwright-chromium'
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

const ensureViteHMRWillPickupChangedFiled = async (filesToModify: string[]) => {
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
