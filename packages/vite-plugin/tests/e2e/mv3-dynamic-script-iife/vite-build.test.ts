import { expect, test } from 'vitest'
import { build } from '../runners'

test(
  'crx runs from build output',
  async () => {
    const { browser } = await build(__dirname)

    // Wait for the background script to register the content script
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Navigate to example.com - the registered content script should inject
    const page = await browser.newPage()
    await page.goto('https://example.com')

    // The main-world.ts script should create a .ok element
    await page.waitForSelector('.ok', { timeout: 15000 })

    const okElement = page.locator('.ok')
    const text = await okElement.textContent()
    expect(text).toBe('ok')
  },
  { retry: process.env.CI ? 5 : 0 },
)
