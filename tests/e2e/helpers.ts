import { BrowserContext, Page } from 'playwright-chromium'

export async function getPage(
  browser: BrowserContext,
  test: RegExp | string,
): Promise<Page> {
  const regex = new RegExp(test)
  const page = await Promise.race([
    browser.waitForEvent('page', async (p) => {
      await p.waitForURL(regex)
      return true
    }),
    ...browser.pages().map(async (p) => {
      await p.waitForURL(regex)
      return p
    }),
  ])

  return page
}
