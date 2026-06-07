import fs from 'fs-extra'
import path from 'pathe'
import { expect, test } from 'vitest'
import { serve } from '../runners'
import {
  waitForContentScriptContent,
  waitForRegisteredContentScripts,
} from '../helpers'

test(
  'iife content script rebuilds on change and works after page reload',
  async () => {
    const src = path.join(__dirname, 'src')
    const src1 = path.join(__dirname, 'src1')
    const src2 = path.join(__dirname, 'src2')

    // Start with the initial version
    // emptyDir + overwrite to avoid rmdir/mkdir races with leftover watchers from prior tests.
    await fs.emptyDir(src)
    await fs.copy(src1, src, { overwrite: true, recursive: true })

    const { browser, outDir } = await serve(__dirname)

    // Wait for the background script to register the content script
    await waitForRegisteredContentScripts(browser, ['main-world-script'])

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

    // Wait for the IIFE rebuild to finish by polling the on-disk bundle for
    // the updated content (more reliable than a fixed timeout).
    await waitForContentScriptContent(
      browser,
      outDir,
      'main-world-script',
      'src2',
    )

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
