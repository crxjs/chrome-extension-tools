import fs from 'fs-extra'
import path from 'pathe'
import { expect, test } from 'vitest'
import { build } from '../runners'

test('shadow dom content script works in production build', async () => {
  const src = path.join(__dirname, 'src')
  const src1 = path.join(__dirname, 'src1')

  await fs.emptyDir(src)
  await fs.copy(src1, src)

  const { browser } = await build(__dirname)

  const page = await browser.newPage()
  await page.goto('https://example.com')

  // Wait for the shadow DOM host element to appear
  const crxRoot = page.locator('crx-root')
  await crxRoot.waitFor({ timeout: 10_000 })

  // Verify shadow root exists
  const hasShadowRoot = await crxRoot.evaluate((el) => el.shadowRoot !== null)
  expect(hasShadowRoot).toBe(true)

  // Check content inside shadow DOM
  const shadowH1Text = await crxRoot.evaluate(
    (el) => el.shadowRoot?.querySelector('h1')?.textContent,
  )
  expect(shadowH1Text).toBe('Shadow DOM Content')

  // Verify the MAIN world script injected host-page styles (h1 turned blue)
  const pageH1 = page.locator('body > h1')
  await page.waitForFunction(
    () =>
      getComputedStyle(document.querySelector('body > h1')!).color ===
      'rgb(0, 0, 255)',
    { timeout: 5_000 },
  )
  const pageH1Color = await pageH1.evaluate((el) => getComputedStyle(el).color)
  expect(pageH1Color).toBe('rgb(0, 0, 255)')

  // Verify content script h1 inside shadow DOM is NOT affected by host CSS
  const shadowH1Color = await crxRoot.evaluate((el) => {
    const h1 = el.shadowRoot?.querySelector('h1')
    return h1 ? getComputedStyle(h1).color : null
  })
  expect(shadowH1Color).toBe('rgb(255, 0, 0)')

  // Also verify <p> inside shadow DOM is not affected by host CSS
  const shadowPColor = await crxRoot.evaluate((el) => {
    const p = el.shadowRoot?.querySelector('p')
    return p ? getComputedStyle(p).color : null
  })
  expect(shadowPColor).not.toBe('rgb(0, 0, 255)')
})
