import fs from 'fs-extra'
import path from 'pathe'
import { expect, test } from 'vitest'
import { createUpdate, getPage, waitForInnerHtml } from '../helpers'
import { serve } from '../runners'

test(
  'crx page update on hmr',
  async () => {
    const src = path.join(__dirname, 'src')
    const src1 = path.join(__dirname, 'src1')
    const src2 = path.join(__dirname, 'src2')

    await fs.remove(src)
    await fs.copy(src1, src, { recursive: true })

    const { browser } = await serve(__dirname)
    const page = await getPage(browser, 'chrome-extension')
    const update = createUpdate({ target: src, src: src2 })

    await page.waitForLoadState()

    const styles = page.locator('head style')
    const button = page.locator('button')

    const buttonText = new Set<string>()

    await button.click()
    buttonText.add(await button.innerText())

    // check that page does not reload during hmr update
    let reloaded = false
    page.on('framenavigated', () => {
      reloaded = true
    })

    // update css files
    await update('css')

    await waitForInnerHtml(styles, (h) => h.includes('border: solid red;'))
    expect(reloaded).toBe(false) // no reload on css update
    buttonText.add(await button.innerText())

    // update jsx files
    await update('jsx')

    await page.locator('p', { hasText: 'Hello Vite + React + CRX!' }).waitFor()
    expect(reloaded).toBe(false) // no reload on jsx update
    buttonText.add(await button.innerText())

    expect(buttonText.size).toBe(1)
    expect(buttonText.has('count is: 1')).toBe(true)
  },
  { retry: process.env.CI ? 5 : 0 },
)
