import { build } from '../runners'

test('crx runs from build output', async () => {
  const { browser } = await build(__dirname)
  const page = await browser.newPage()
  await page.goto('https://www.google.com')

  const app = page.locator('#app')
  await app.locator('img').waitFor()

  expect(await app.screenshot()).toMatchImageSnapshot()
})
