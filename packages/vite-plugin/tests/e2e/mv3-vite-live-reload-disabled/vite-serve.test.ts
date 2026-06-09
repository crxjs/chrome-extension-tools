import fs from 'fs-extra'
import path from 'pathe'
import { expect, test } from 'vitest'
import { createUpdate, getPage } from '../helpers'
import { serve } from '../runners'

test('liveReload false: background change does not trigger runtime reload', async () => {
  const src = path.join(__dirname, 'src')
  const src1 = path.join(__dirname, 'src1')
  const src2 = path.join(__dirname, 'src2')

  await fs.remove(src)
  await fs.copy(src1, src, { recursive: true })

  const { browser, routes } = await serve(__dirname)

  const page = await browser.newPage()
  const update = createUpdate({ target: src, src: src2 })
  const app = page.locator('#app')

  await page.goto('https://example.com')
  await app.waitFor()

  let reloads = 0
  routes.subscribe(() => {
    reloads++
  })

  const optionsPage = await getPage(browser, /options.html$/)
  expect(optionsPage.isClosed()).toBe(false)

  // update background dependency -> should NOT trigger runtime reload
  await update('bg-onload.ts')

  // wait enough time for a reload to have happened if it was going to
  await new Promise((r) => setTimeout(r, 3000))

  // runtime reload did NOT happen: options page still open, no page reloads
  expect(optionsPage.isClosed()).toBe(false)
  expect(reloads).toBe(0)
})
