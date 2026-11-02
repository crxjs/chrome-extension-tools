import fs from 'fs-extra'
import path from 'pathe'
import type { Page } from 'playwright-chromium'
import { expect, test, vi } from 'vitest'
import { createUpdate } from '../helpers'
import { serve } from '../runners'

async function waitForProgressCount(page: Page, expected: number) {
  const app = page.locator('#app')
  const expectedCount = String(expected)

  for (let i = 0; i < 150; i++) {
    const count = await app.getAttribute('data-count')
    if (count === expectedCount) return
    if (count && Number(count) > expected) break
    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  expect(await app.getAttribute('data-count')).toBe(expectedCount)
}

test('background dependency update does not duplicate service worker modules', async () => {
  const src = path.join(__dirname, 'src')
  const src1 = path.join(__dirname, 'src1')
  const src2 = path.join(__dirname, 'src2')

  await fs.remove(src)
  await fs.copy(src1, src)

  const { browser, devServer } = await serve(__dirname)
  const page = await browser.newPage()
  const update = createUpdate({ target: src, src: src2 })

  await page.goto('https://example.com')
  await waitForProgressCount(page, 1)
  // Runtime messages can arrive before the background's HMR socket connects.
  await vi.waitFor(
    () => expect(devServer.ws.clients.size).toBeGreaterThan(0),
    { timeout: 5_000 },
  )

  await Promise.all([
    // A fulfilled request precedes navigation commit; inspect the new document.
    page.waitForNavigation({ waitUntil: 'load', timeout: 15_000 }),
    update('progress.ts'),
  ])
  await waitForProgressCount(page, 1)

  await new Promise((resolve) => setTimeout(resolve, 500))
  expect(await page.locator('#app').getAttribute('data-count')).toBe('1')
})
