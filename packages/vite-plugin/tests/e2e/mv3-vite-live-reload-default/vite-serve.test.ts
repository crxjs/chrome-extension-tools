import fs from 'fs-extra'
import path from 'pathe'
import { firstValueFrom } from 'rxjs'
import { expect, test } from 'vitest'
import { createUpdate, getPage } from '../helpers'
import { serve } from '../runners'

test('liveReload default: background change triggers runtime reload', async () => {
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

  // update background dependency -> should trigger runtime reload
  const closeEvent = optionsPage.waitForEvent('close', { timeout: 5000 })
  await update('bg-onload.ts')
  await firstValueFrom(routes)
  await closeEvent

  // runtime reload happened: options page closed, content script page reloaded
  expect(optionsPage.isClosed()).toBe(true)
  expect(reloads).toBeGreaterThanOrEqual(1)
  await app.waitFor({ timeout: 15_000 })
})
