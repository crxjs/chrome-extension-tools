import { BrowserContext, Page } from 'playwright-chromium'

export async function getPage(
  browserContext: BrowserContext,
  included: string,
) {
  let count = 0
  let page: Page | undefined

  console.log('get page', included)
  while (!page && count < 50) {
    const pages = browserContext.pages()
    console.log(
      'pages',
      pages.map((p) => p.url()),
    )
    page = pages.find((p) => p.url().includes(included))
    console.log('page', page)
    if (!page) await new Promise((r) => setTimeout(r, 100))
    count++
  }

  console.log('get page loop done', page)
  if (!page) throw new Error(`Could not get page "${included}"`)
  return page
}
