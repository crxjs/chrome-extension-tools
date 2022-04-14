import { serve } from '../runners'

test('crx runs from server output', async () => {
  const { browser } = await serve(__dirname)
  const page = await browser.newPage()
  await page.goto('https://www.google.com')

  const app = page.locator('#app')
  await app.waitFor()

  expect(await app.screenshot()).toMatchImageSnapshot()
})
