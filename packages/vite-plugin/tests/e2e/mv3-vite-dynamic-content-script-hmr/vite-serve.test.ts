import fs from 'fs-extra'
import path from 'pathe'
import { expect, test } from 'vitest'
import { createUpdate, waitForInnerHtml } from '../helpers'
import { serve } from '../runners'
import { header } from './src2/header'

test(
  'crx page update on hmr',
  async () => {
    const src = path.join(__dirname, 'src')
    const src1 = path.join(__dirname, 'src1')
    const src2 = path.join(__dirname, 'src2')

    await fs.remove(src)
    await fs.copy(src1, src, { recursive: true })

    const { browser, routes } = await serve(__dirname)

    const page = await browser.newPage()
    const update = createUpdate({ target: src, src: src2 })
    await page.goto('https://example.com')

    const app = page.locator('#app')
    await app.waitFor({ timeout: 15_000 })

    const styles = page.locator('head style')

    // page reloads aren't reliable in CI, tracking route hits
    let reloads = 0
    routes.subscribe(() => {
      reloads++
    })

    // update css file -> trigger css update
    await update('css')

    await waitForInnerHtml(styles, (h) => h.includes('background-color: red;'))
    expect(reloads).toBe(0) // no reload on css update

    // update header.ts file -> trigger full reload
    await update('header.ts')

    await page.locator('h1', { hasText: header }).waitFor()
    expect(reloads).toBeGreaterThanOrEqual(1) // full reload on jsx update
  },
  { retry: 2 },
)
