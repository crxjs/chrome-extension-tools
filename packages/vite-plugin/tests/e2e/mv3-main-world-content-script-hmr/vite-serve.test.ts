import fs from 'fs-extra'
import path from 'pathe'
import { expect, test } from 'vitest'
import { createUpdate } from '../helpers'
import { serve } from '../runners'

async function waitForMainWorldMessage(
  page: {
    evaluate: <T>(fn: () => T) => Promise<T>
  },
  expected: string,
) {
  const deadline = Date.now() + 15_000
  while (Date.now() < deadline) {
    const actual = await page.evaluate(() => window.crxMainWorldHmrMessage)
    if (actual === expected) return
    await new Promise((r) => setTimeout(r, 100))
  }

  throw new Error(`Timed out waiting for MAIN world message "${expected}"`)
}

test(
  'MAIN world content script updates through HMR without reloading the page',
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

    const marker = page.locator('#crx-main-world-hmr')
    await marker.waitFor({ timeout: 15_000 })
    expect(await marker.textContent()).toBe('MAIN world HMR before update')
    await waitForMainWorldMessage(page, 'MAIN world HMR before update')

    let reloads = 0
    routes.subscribe(() => {
      reloads++
    })

    await update('content.ts')

    await waitForMainWorldMessage(page, 'MAIN world HMR after update')
    expect(await marker.textContent()).toBe('MAIN world HMR after update')
    expect(reloads).toBe(0)
  },
  { retry: process.env.CI ? 5 : 2 },
)
