import fs from 'fs-extra'
import path from 'pathe'
import { expect, test } from 'vitest'
import { build } from '../runners'

test(
  'crx runs from build output',
  async () => {
    const src = path.join(__dirname, 'src')
    const src1 = path.join(__dirname, 'src1')

    // Use the initial version for build test
    await fs.remove(src)
    await fs.copy(src1, src, { recursive: true })

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
    expect(text).toBe('src1')
  },
  { retry: process.env.CI ? 5 : 0 },
)
