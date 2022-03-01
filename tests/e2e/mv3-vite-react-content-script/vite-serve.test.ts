import { serve } from '../runners'

test('crx runs from server output', async () => {
  const { browser } = await serve(__dirname)
  const page = await browser.newPage()
  await page.goto('https://www.google.com')
  await page.emulateMedia({ reducedMotion: 'reduce' })

  const app = page.locator('.App')
  await app.waitFor()

  expect(await app.screenshot()).toMatchImageSnapshot()
})
