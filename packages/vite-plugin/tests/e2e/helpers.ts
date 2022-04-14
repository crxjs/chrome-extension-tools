import jsesc from 'jsesc'
import { BrowserContext, Locator, Page } from 'playwright-chromium'

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

/** WaitForFunction uses eval, which doesn't work for CRX */
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
