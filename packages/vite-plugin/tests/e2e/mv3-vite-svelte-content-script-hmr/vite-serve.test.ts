import fs from 'fs-extra'
import path from 'path'
import { createUpdate, waitForInnerHtml } from '../helpers'
import { serve } from '../runners'
import { test, expect } from 'vitest'

test('crx page update on hmr', async () => {
  const src = path.join(__dirname, 'src')
  const src1 = path.join(__dirname, 'src1')
  const src2 = path.join(__dirname, 'src2')
  const src3 = path.join(__dirname, 'src3')

  await fs.remove(src)
  await fs.copy(src1, src, { recursive: true })

  const { browser } = await serve(__dirname)
  const page = await browser.newPage()
  const update = createUpdate({ target: src, src: src2 })

  const styles = page.locator('head style')
  const app = page.locator('#crx-app')
  const button = app.locator('button')

  await page.goto('https://www.google.com')
  await app.waitFor()

  // check that page does not update during hmr update
  let reloaded = false
  page.on('framenavigated', () => {
    reloaded = true
  })

  const buttonText = new Set<string>()

  await button.click()
  buttonText.add(await button.innerText())

  // update template
  await update('App.svelte')

  await page
    .locator('p', { hasText: 'Make a Chrome Extension with Svelte and Vite!' })
    .waitFor()
  expect(reloaded).toBe(false) // no reload on template update
  buttonText.add(await button.innerText())

  // vite doesn't hot update if the change is too quick
  await new Promise((r) => setTimeout(r, 100))

  // update css
  await update('App.svelte', src3)

  await waitForInnerHtml(styles, (h) => {
    return h.includes('background-color:blue;')
  })
  expect(reloaded).toBe(false) // no reload on css update
  buttonText.add(await button.innerText())

  expect(buttonText.size).toBe(1)
  expect(buttonText.has('Count: 1')).toBe(true)
})
