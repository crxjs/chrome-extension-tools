import fs from 'fs-extra'
import path from 'pathe'
import { expect, test } from 'vitest'
import { waitForRegisteredContentScripts } from '../helpers'
import { build } from '../runners'

test(
  'crx runs from build output',
  async () => {
    const src = path.join(__dirname, 'src')
    const src1 = path.join(__dirname, 'src1')

    // Use the initial version for build test
    await fs.emptydir(src)
    await fs.copy(src1, src, { overwrite: true })

    const { browser } = await build(__dirname)

    // Wait for the background script to register the content script
    await waitForRegisteredContentScripts(browser, ['main-world-script'])

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
