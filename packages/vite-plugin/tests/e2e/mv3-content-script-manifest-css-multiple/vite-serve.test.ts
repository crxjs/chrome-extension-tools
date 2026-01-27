import { expect, test } from 'vitest'
import { serve } from '../runners'
import { Page } from 'playwright-chromium'

/** Polls for a specific computed style value with retry logic */
async function waitForComputedStyle(
  page: Page,
  selector: string,
  property: string,
  expectedValue: string,
  timeout = 30000,
): Promise<void> {
  const interval = 100
  const maxAttempts = timeout / interval
  let attempts = 0

  while (attempts < maxAttempts) {
    const value = await page.evaluate(
      ({ selector, property }) => {
        const element = document.querySelector(selector)
        if (!element) return null
        return window.getComputedStyle(element)[property as any]
      },
      { selector, property },
    )
    if (value === expectedValue) {
      return
    }
    attempts++
    await new Promise((r) => setTimeout(r, interval))
  }

  throw new Error(
    `Timed out waiting for ${selector} ${property} to be "${expectedValue}"`,
  )
}

// Test that multiple JS files with multiple CSS files work correctly
// This verifies the CSS injection handles multiple content scripts properly
test(
  'multiple JS content scripts with multiple CSS files work correctly',
  async () => {
    const { browser } = await serve(__dirname)
    const page = await browser.newPage()

    await page.goto('https://example.com')

    // Wait for all content script markers
    const marker1 = page.locator('#crx-content-script-1')
    const marker2 = page.locator('#crx-content-script-2')
    const marker3 = page.locator('#crx-content-script-3')

    await marker1.waitFor({ state: 'attached' })
    await marker2.waitFor({ state: 'attached' })
    await marker3.waitFor({ state: 'attached' })

    console.log('✓ All 3 content scripts loaded')

    // Verify both CSS files are applied
    // styles1.css sets body background to red
    await waitForComputedStyle(
      page,
      'body',
      'backgroundColor',
      'rgb(255, 0, 0)',
    )
    console.log('✓ styles1.css applied (red background)')

    // styles2.css sets h1 color to blue
    await waitForComputedStyle(page, 'h1', 'color', 'rgb(0, 0, 255)')
    console.log('✓ styles2.css applied (blue h1)')

    // Count how many style tags contain our CSS to check for duplicates
    const styleCount = await page.evaluate(() => {
      const styles = document.querySelectorAll('head style')
      let redBgCount = 0
      let blueH1Count = 0

      styles.forEach((style) => {
        const content = style.textContent || ''
        if (content.includes('rgb(255, 0, 0)')) redBgCount++
        if (content.includes('rgb(0, 0, 255)')) blueH1Count++
      })

      return { redBgCount, blueH1Count, totalStyles: styles.length }
    })

    console.log(`Style tags found: ${styleCount.totalStyles}`)
    console.log(`  - Red background rules: ${styleCount.redBgCount}`)
    console.log(`  - Blue h1 rules: ${styleCount.blueH1Count}`)

    // Each CSS should only be loaded once, not 3 times (once per JS file)
    expect(styleCount.redBgCount).toBe(1)
    expect(styleCount.blueH1Count).toBe(1)

    console.log('✓ CSS files are not duplicated')
  },
  { retry: 2 },
)
