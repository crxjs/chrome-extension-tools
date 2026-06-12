import fs from 'fs-extra'
import path from 'pathe'
import { expect, test } from 'vitest'
import { createUpdate } from '../helpers'
import { serve } from '../runners'

declare global {
  interface Window {
    crxReactMainWorldHmrMessage?: string
  }
}

async function waitForReactMainWorldMessage(
  page: {
    evaluate: <T>(fn: () => T) => Promise<T>
  },
  expected: string,
) {
  const deadline = Date.now() + 15_000
  while (Date.now() < deadline) {
    const actual = await page.evaluate(() => window.crxReactMainWorldHmrMessage)
    if (actual === expected) return
    await new Promise((r) => setTimeout(r, 100))
  }

  throw new Error(
    `Timed out waiting for React MAIN world message "${expected}"`,
  )
}

test(
  'React MAIN world content script updates through HMR without reloading the page',
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

    const app = page.locator('#crx-react-main-world-hmr')
    await app.waitFor({ timeout: 15_000 })
    await waitForReactMainWorldMessage(
      page,
      'React MAIN world HMR before update',
    )

    const message = app.locator('p')
    const button = app.locator('button')
    await button.click()
    expect(await button.innerText()).toBe('count is: 1')

    let reloads = 0
    routes.subscribe(() => {
      reloads++
    })

    let navigated = false
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) navigated = true
    })

    await update('App.jsx')

    await waitForReactMainWorldMessage(
      page,
      'React MAIN world HMR after update',
    )
    expect(await message.textContent()).toBe(
      'React MAIN world HMR after update',
    )
    expect(await button.innerText()).toBe('count is: 1')
    expect(reloads).toBe(0)
    expect(navigated).toBe(false)
  },
  { retry: process.env.CI ? 5 : 2 },
)
