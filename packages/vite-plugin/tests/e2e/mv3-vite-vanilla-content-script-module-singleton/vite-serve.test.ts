import { expect, test } from 'vitest'
import { serve } from '../runners'

test('crx page update on hmr', async () => {
  const { browser } = await serve(__dirname)
  const page = await browser.newPage()

  const root = page.locator('#root')

  // load page for the first time
  await page.goto('https://example.com')
  await root.waitFor({ timeout: 100 })

  const text = await root.textContent()
  expect(text).toMatch('true')
})
