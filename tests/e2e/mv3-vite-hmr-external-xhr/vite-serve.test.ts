import { serve } from '../runners'

test('crx runs from server output', async () => {
  const { browser } = await serve(__dirname)

  // creates a mock route handler that returns ok
  // which allows the options page to fetch an "external" resource
  await browser.route('http://mock-api-route.test/', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'text/plain',
      body: 'ok',
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    })
  })

  const page = await browser.newPage()
  // we wait for one second for the browser to initialize and the background script's onInstalled handler to fire and open the options page
  await page.waitForTimeout(1000)
  const pages = await browser.pages()
  // to test for text on the options page, we need to find the newly opened extension page that was opened by the background script on install
  const optionsPage = pages.find((p) => p.url().includes('chrome-extension://'))
  if (optionsPage) {
    // we need to reload the options page, because many times on initial load, the bundler has not finished and we're returned a blank options page with no content
    // this might be something to improve later, since in theory we're checking for files ready, but that doesn't always happen. forcing a reload seems to make it work consistently
    await optionsPage.reload()
    await optionsPage.waitForSelector('text=external XHR: Yes')
  } else {
    throw new Error('Options page was not opened')
  }
})
