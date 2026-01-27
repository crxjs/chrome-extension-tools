import fs from 'fs-extra'
import path from 'pathe'
import { expect, test } from 'vitest'
import { createUpdate } from '../helpers'
import { serve } from '../runners'
import { Page } from 'playwright-chromium'

/** Polls for a specific background color on document.body with retry logic */
async function waitForBackgroundColor(
  page: Page,
  expectedColor: string,
  timeout = 30000,
): Promise<void> {
  const interval = 100
  const maxAttempts = timeout / interval
  let attempts = 0

  while (attempts < maxAttempts) {
    const bgColor = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor
    })
    if (bgColor === expectedColor) {
      return
    }
    attempts++
    await new Promise((r) => setTimeout(r, interval))
  }

  throw new Error(
    `Timed out waiting for background color to be "${expectedColor}"`,
  )
}

// Test that CSS declared in manifest content_scripts supports HMR
// This verifies the CSS injection approach works for hot module replacement
test.skipIf(process.env.CI)(
  'manifest CSS in content_scripts supports HMR',
  async () => {
    const src = path.join(__dirname, 'src')
    const src1 = path.join(__dirname, 'src1')
    const src2 = path.join(__dirname, 'src2')

    // Start with initial source
    await fs.remove(src)
    await fs.copy(src1, src, { recursive: true })

    const { browser, routes } = await serve(__dirname)
    const page = await browser.newPage()
    const update = createUpdate({ target: src, src: src2 })

    await page.goto('https://example.com')

    // Wait for content script marker element
    const marker = page.locator('#crx-content-script-loaded')
    await marker.waitFor({ state: 'attached' })

    // Wait for initial CSS to be applied - body should have red background
    await waitForBackgroundColor(page, 'rgb(255, 0, 0)')
    console.log('✓ Initial CSS applied correctly (red background)')

    // Track page reloads via route hits
    let reloads = 0
    routes.subscribe(() => {
      reloads++
    })

    // Update CSS file -> trigger CSS HMR update
    await update('styles.css')

    // Wait for HMR to apply the new styles (blue background)
    await waitForBackgroundColor(page, 'rgb(0, 0, 255)')

    // Verify no page reload occurred - this is the key HMR test
    expect(reloads).toBe(0)
    console.log('✓ CSS HMR applied without page reload')
    console.log('✓ Updated CSS applied correctly (blue background)')
  },
  { retry: 2 },
)
