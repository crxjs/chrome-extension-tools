import { build } from '../runners'

test('crx runs from build output', async () => {
  const { browser } = await build(__dirname)
  const page = await browser.newPage()
  await page.goto('http://www.google.com')

  const app = page.locator('#crx-app')
  await app.locator('img').waitFor()

  expect(await app.screenshot()).toMatchImageSnapshot()
})
