import { serve } from '../runners'

test('crx runs from server output', async () => {
  const { browser } = await serve(__dirname)
  const page = await browser.newPage()
  const container = page.locator('div.container')
  const mainWorldScript = container.locator('p.script')

  await page.goto('https://www.google.com')
  await container.waitFor({ state: 'attached' })
  await mainWorldScript.waitFor({ state: 'attached' })
})
