import fs from 'fs-extra'
import path from 'pathe'
import { expect, test } from 'vitest'
import { serve } from '../runners'

// Skip on Windows: file watcher has reliability issues detecting IIFE rebuilds
const isWindows = process.platform === 'win32'

test.skipIf(isWindows)(
  'iife content script rebuilds on change and works after page reload',
  async () => {
    const src = path.join(__dirname, 'src')
    const src1 = path.join(__dirname, 'src1')
    const src2 = path.join(__dirname, 'src2')

    // Start with the initial version
    await fs.remove(src)
    await fs.copy(src1, src, { recursive: true })

    const { browser } = await serve(__dirname)

    // Wait for the background script to register the content script
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Navigate to example.com - the registered content script should inject
    const page = await browser.newPage()
    await page.goto('https://example.com')

    // The main-world.ts script should create a .ok element with "src1" text
    await page.waitForSelector('.ok', { timeout: 15000 })
    const okElement = page.locator('.ok')
    expect(await okElement.textContent()).toBe('src1')

    // Now update ONLY the main-world.ts file (not background.ts)
    // This directly copies the file to avoid any race conditions
    await fs.copyFile(
      path.join(src2, 'main-world.ts'),
      path.join(src, 'main-world.ts'),
    )

    // Wait for the file watcher to pick up changes and rebuild the IIFE
    // Note: IIFE scripts don't have HMR, but they should rebuild on file change
    await new Promise((resolve) => setTimeout(resolve, 5000))

    // Reload the page - the updated script should now inject
    // Navigate to a different page first to clear any cache
    await page.goto('https://example.org')
    await new Promise((resolve) => setTimeout(resolve, 500))
    await page.goto('https://example.com')

    // Wait for the updated element with "src2" text
    await page.waitForSelector('.ok', { timeout: 15000 })
    const updatedElement = page.locator('.ok')
    expect(await updatedElement.textContent()).toBe('src2')
  },
  { retry: process.env.CI ? 5 : 0 },
)
