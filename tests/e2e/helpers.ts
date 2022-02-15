import { BrowserContext, Page } from 'playwright-chromium'

export async function getPage(browserContext: BrowserContext, test: string) {
  let count = 0
  let page: Page | undefined
  let pages: Page[] = []

  while (!page && count < 50) {
    pages = browserContext.pages()
    page = pages.find((p) => p.url().includes(test))
    if (!page) await new Promise((r) => setTimeout(r, 100))
    count++
  }

  if (!page) {
    console.log({ included: test, page, pages: pages.map((p) => p.url()) })
    throw new Error(`Could not get page "${test}"`)
  }

  return page
}
