import fs from 'fs-extra'
import path from 'path'
import { expect, test } from 'vitest'
import { getPage, waitForInnerHtml } from '../helpers'
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

    const { browser } = await serve(__dirname)
    const optionsPage = await getPage(browser, /options.html$/)

    const page = await browser.newPage()
    await page.goto('https://example.com')

    const app = page.locator('#app')
    await app.waitFor()

    const styles = page.locator('head style')

    // track page reloads
    let reloads = 0
    page.on('framenavigated', () => {
      reloads++
    })

    // update css file -> trigger css update
    await fs.copy(src2, src, {
      recursive: true,
      overwrite: true,
      filter: (f) => {
        if (fs.lstatSync(f).isDirectory()) return true
        return f.endsWith('css')
      },
    })

    console.log('copy 1')

    await waitForInnerHtml(styles, (h) => h.includes('background-color: red;'))
    expect(reloads).toBe(0) // no reload on css update
    expect(optionsPage.isClosed()).toBe(false) // no runtime reload on css update

    // update header.ts file -> trigger full reload
    await fs.copy(src2, src, {
      recursive: true,
      filter: (f) => {
        if (fs.lstatSync(f).isDirectory()) return true
        return f.endsWith('header.ts')
      },
    })

    console.log('copy 2')

    await page.locator('h1', { hasText: header }).waitFor()
    expect(reloads).toBeGreaterThanOrEqual(1) // full reload on jsx update
    expect(optionsPage.isClosed()).toBe(false) // no runtime reload on js update

    console.log('pre-copy 3')

    // update background.ts file -> trigger runtime reload
    await Promise.all([
      // TODO: this should trigger a runtime reload
      optionsPage
        .waitForEvent('close', { timeout: 5000 })
        .then(() => console.log('options page closed')), // options page should close
      page
        .waitForEvent('load', { timeout: 5000 })
        .then(() => console.log('content script reload')), // content script should reload
      fs
        .copy(src2, src, {
          recursive: true,
          filter: (f) => {
            if (fs.lstatSync(f).isDirectory()) return true
            return f.endsWith('bg-onload.ts')
          },
        })
        .then(() => console.log('fs.copy done')),
    ])

    console.log('copy 3')

    await app.waitFor()

    expect(reloads).toBeGreaterThanOrEqual(2)
    expect(optionsPage.isClosed()).toBe(true)
  },
  { retry: process.env.CI ? 5 : 0 },
)
