import { getPage } from '../helpers'
import { serve } from '../runners'

test('crx runs from server output', async () => {
  const { browser } = await serve(__dirname)
  const page = await getPage(browser, 'chrome-extension')

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.waitForSelector('.App')

  expect(await page.screenshot()).toMatchImageSnapshot()
})
