import { getPage } from '../helpers'
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

  const page = await getPage(browser, 'chrome-extension')
  await page.waitForSelector('text=external XHR: Yes')
})
