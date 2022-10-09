import { serve } from '../runners'

jest.retryTimes(2)

test('crx runs from server output', async () => {
  const { browser } = await serve(__dirname)
  const page = await browser.newPage()
  await page.goto('https://example.com')

  const app = page.locator('#app')
  await app.waitFor()

  expect(await app.screenshot()).toMatchImageSnapshot({
    customSnapshotIdentifier: __filename + 1,
  })
})
