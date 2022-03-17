import { getPage } from '../helpers'
import { build } from '../runners'

test('crx runs from build output', async () => {
  const { browser } = await build(__dirname)
  const page = await getPage(browser, 'chrome-extension')

  await page.emulateMedia({ reducedMotion: 'reduce' })
  const app = page.locator('.App')
  await app.waitFor()

  expect(await app.screenshot()).toMatchImageSnapshot()
})
