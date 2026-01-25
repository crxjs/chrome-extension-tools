import { expect, test } from 'vitest'
import { serve } from '../runners'

test(
  'CSS declared in manifest content_scripts is applied in dev mode',
  async () => {
    const { browser } = await serve(__dirname)
    const page = await browser.newPage()

    await page.goto('https://example.com')

    // Wait for content script marker element
    const marker = page.locator('#crx-content-script-loaded')
    await marker.waitFor({ state: 'attached' })

    // Verify the CSS from manifest is applied - body should have red background
    const bgColor = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor
    })

    expect(bgColor).toBe('rgb(255, 0, 0)')
    console.log(
      '✓ CSS declared in manifest content_scripts is applied correctly in dev mode',
    )
  },
  { retry: 2 },
)
