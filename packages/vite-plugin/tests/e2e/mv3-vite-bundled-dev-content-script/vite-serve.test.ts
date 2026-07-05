import { expect, test } from 'vitest'
import { serve } from '../runners'

test(
  'content script runs with Vite bundled dev mode',
  async () => {
    const { browser } = await serve(__dirname)

    const page = await browser.newPage()
    await page.goto('https://example.com')

    const marker = page.locator('#bundled-dev-content-script-test')
    await marker.waitFor({ timeout: 10000 })

    expect(await marker.textContent()).toBe(
      'Vite bundled dev content script loaded',
    )
  },
  {
    retry: process.env.CI ? 5 : 0,
  },
)
