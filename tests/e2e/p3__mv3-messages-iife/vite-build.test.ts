import { build } from '../runners'

test.skip('crx runs from build output', async () => {
  const { browser } = await build(__dirname)

  const page = await browser.newPage()
  await page.goto('https://google.com')

  await page.waitForSelector('text="Content script loaded"')
  await page.waitForSelector('text="Background response"')
  await page.waitForSelector('text="Background OK"')
  await page.waitForSelector('text="Options page OK"')
})
