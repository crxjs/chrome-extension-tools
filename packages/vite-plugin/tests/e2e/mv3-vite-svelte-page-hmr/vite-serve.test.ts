import fs from 'fs-extra'
import path from 'path'
import { getPage, waitForInnerHtml } from '../helpers'
import { serve } from '../runners'
import { test, expect } from 'vitest'

// TODO: what should happen in this test?
// TODO: add imports to svelte packages to trigger dependency rebundle (import {...} from 'svelte')
test.skip('crx page update on hmr', async () => {
  const src = path.join(__dirname, 'src')
  const src1 = path.join(__dirname, 'src1')
  const src2 = path.join(__dirname, 'src2')
  const src3 = path.join(__dirname, 'src3')

  await fs.remove(src)
  await fs.copy(src1, src, { recursive: true })

  const { browser } = await serve(__dirname)
  const page = await getPage(browser, 'chrome-extension')

  await page.waitForLoadState()

  const styles = page.locator('head style')

  // check that page does not update during hmr update
  let reloaded = false
  page.on('framenavigated', () => {
    reloaded = true
  })

  // update template
  await fs.copy(src2, src, {
    recursive: true,
    overwrite: true,
    filter: (f) => {
      if (fs.lstatSync(f).isDirectory()) return true
      return f.endsWith('App.svelte')
    },
  })

  await page
    .locator('h1', { hasText: 'Hello Vite + Svelte + CRXJS!' })
    .waitFor()
  expect(reloaded).toBe(false) // no reload on template update

  // vite doesn't hot update if the change is too quick
  await new Promise((r) => setTimeout(r, 100))

  // update css
  await fs.copy(src3, src, {
    recursive: true,
    overwrite: true,
    filter: (f) => {
      if (fs.lstatSync(f).isDirectory()) return true
      return f.endsWith('App.svelte')
    },
  })

  await waitForInnerHtml(styles, (h) => h.includes('color:blue;'))
  expect(reloaded).toBe(false) // no reload on css update
})
