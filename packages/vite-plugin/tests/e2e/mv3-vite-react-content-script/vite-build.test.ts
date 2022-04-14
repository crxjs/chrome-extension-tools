import { build } from '../runners'

test('crx runs from build output', async () => {
  const { browser } = await build(__dirname)
  const page = await browser.newPage()
  await page.goto('https://www.google.com')

  await page.emulateMedia({ reducedMotion: 'reduce' })

  const app = page.locator('.App')

  await app.waitFor()

  expect(await app.screenshot()).toMatchImageSnapshot()
})
