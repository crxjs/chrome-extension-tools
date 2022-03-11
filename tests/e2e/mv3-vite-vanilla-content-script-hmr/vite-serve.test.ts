import fs from 'fs-extra'
import path from 'path'
import { getPage, waitForInnerHtml } from '../helpers'
import { serve } from '../runners'
import { header } from './src2/header'

test('crx page update on hmr', async () => {
  const src = path.join(__dirname, 'src')
  const src1 = path.join(__dirname, 'src1')
  const src2 = path.join(__dirname, 'src2')

  await fs.remove(src)
  await fs.copy(src1, src, { recursive: true })

  const { browser } = await serve(__dirname)
  const optionsPage = await getPage(browser, /options.html$/)

  const page = await browser.newPage()
  await page.goto('https://www.google.com')

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

  await page.locator('h1', { hasText: header }).waitFor()
  expect(reloads).toBe(1) // full reload on jsx update
  expect(optionsPage.isClosed()).toBe(false) // no runtime reload on js update

  // update background.ts file -> trigger runtime reload
  await Promise.all([
    fs.copy(src2, src, {
      recursive: true,
      filter: (f) => {
        if (fs.lstatSync(f).isDirectory()) return true
        return f.endsWith('background.ts')
      },
    }),
    optionsPage.waitForEvent('close'), // options page should close
    page.waitForEvent('framenavigated'), // content script should reload
  ])

  await app.waitFor()

  expect(reloads).toBe(2)
  expect(optionsPage.isClosed()).toBe(true)
})
