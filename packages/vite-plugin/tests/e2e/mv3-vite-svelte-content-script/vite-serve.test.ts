import { serve } from '../runners'

test('crx runs from server output', async () => {
  const { browser } = await serve(__dirname)
  const page = await browser.newPage()
  await page.goto('http://www.google.com')

  const app = page.locator('#crx-app')
  await app.locator('img').waitFor()

  expect(await app.screenshot()).toMatchImageSnapshot()
})
