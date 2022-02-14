import { BrowserContext, Page } from 'playwright-chromium'

export async function getPage(
  browserContext: BrowserContext,
  included: string,
) {
  let count = 0
  let page: Page | undefined

  while (!page && count < 50) {
    page = browserContext.pages().find((p) => p.url().includes(included))
    if (!page) await new Promise((r) => setTimeout(r, 100))
    count++
  }

  if (!page) throw new Error(`Could not get page "${included}"`)
  return page
}
