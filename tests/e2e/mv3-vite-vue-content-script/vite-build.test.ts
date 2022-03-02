import { build } from '../runners'

test('crx runs from build output', async () => {
  const { browser } = await build(__dirname)
  const page = await browser.newPage()
  await page.goto('https://www.google.com')

  await page.waitForSelector('#app img')

  expect(await page.screenshot()).toMatchImageSnapshot()
})
