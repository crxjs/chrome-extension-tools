import fs from 'fs-extra'
import path from 'pathe'
import { expect, test } from 'vitest'
import { createUpdate, getPage, waitForInnerHtml } from '../helpers'
import { serve } from '../runners'

// Windows file system watcher has reliability issues with extension page HMR
// This test works on Ubuntu and macOS but is flaky on Windows CI due to
// chokidar/NTFS timing issues. Content script HMR tests cover the core functionality.
const isWindows = process.platform === 'win32'

test.skipIf(isWindows)(
  'crx page update on hmr',
  async () => {
    const src = path.join(__dirname, 'src')
    const src1 = path.join(__dirname, 'src1')
    const src2 = path.join(__dirname, 'src2')
    const src3 = path.join(__dirname, 'src3')

    await fs.remove(src)
    await fs.copy(src1, src, { recursive: true })

    const { browser } = await serve(__dirname)
    const page = await getPage(browser, 'chrome-extension')
    const update = createUpdate({ target: src, src: src2 })
    const styles = page.locator('head style')
    const button = page.locator('button')
    const buttonText = new Set<string>()

    await page.waitForLoadState()
    await button.click()
    buttonText.add(await button.innerText())

    // check that page does not update during hmr update
    let reloaded = false
    page.on('framenavigated', () => {
      reloaded = true
    })

    // update template
    await update('vue')

    await page
      .locator('h1', { hasText: 'Hello Vue 3 + Vite + CRX' })
      .waitFor({ timeout: 15_000 })
    expect(reloaded).toBe(false) // no reload on template update
    buttonText.add(await button.innerText())

    // vite doesn't hot update if the change is too quick
    await new Promise((r) => setTimeout(r, 100))

    // update css
    await update('vue', src3)

    await waitForInnerHtml(styles, (h) => h.includes('background: red;'))
    expect(reloaded).toBe(false) // no reload on css update
    buttonText.add(await button.innerText())

    expect(buttonText.size).toBe(1)
    expect(buttonText.has('count is: 1')).toBe(true)
  },
  { retry: process.env.CI ? 5 : 0 },
)
