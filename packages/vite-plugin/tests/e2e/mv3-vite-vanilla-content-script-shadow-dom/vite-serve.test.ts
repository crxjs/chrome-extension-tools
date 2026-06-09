import fs from 'fs-extra'
import path from 'pathe'
import { expect, test } from 'vitest'
import { createUpdate, waitForInnerHtml } from '../helpers'
import { serve } from '../runners'

test('shadow dom content script isolates styles from host page', async () => {
  const src = path.join(__dirname, 'src')
  const src1 = path.join(__dirname, 'src1')
  const src2 = path.join(__dirname, 'src2')

  await fs.emptyDir(src)
  await fs.copy(src1, src)

  const { browser, routes } = await serve(__dirname)

  const page = await browser.newPage()
  const update = createUpdate({ target: src, src: src2 })

  await page.goto('https://example.com')

  // Wait for the shadow DOM host element to appear
  const crxRoot = page.locator('crx-root')
  await crxRoot.waitFor({ timeout: 10_000 })

  // Verify the shadow root exists and contains our content
  const hasShadowRoot = await crxRoot.evaluate((el) => el.shadowRoot !== null)
  expect(hasShadowRoot).toBe(true)

  // Check content inside shadow DOM
  const shadowH1Text = await crxRoot.evaluate(
    (el) => el.shadowRoot?.querySelector('h1')?.textContent,
  )
  expect(shadowH1Text).toBe('Shadow DOM Content')

  // Verify the MAIN world script injected host-page styles (h1 turned blue)
  const pageH1 = page.locator('body > h1')
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

  // Track reloads
  let reloads = 0
  routes.subscribe(() => {
    reloads++
  })

  // Update CSS file -> trigger CSS HMR update
  await update('css')

  // Wait for the HMR update: h1 should turn green inside shadow DOM
  await page.waitForFunction(
    () => {
      const crxRoot = document.querySelector('crx-root')
      const h1 = crxRoot?.shadowRoot?.querySelector('h1')
      return h1 ? getComputedStyle(h1).color === 'rgb(0, 128, 0)' : false
    },
    { timeout: 10_000 },
  )

  // Verify no full page reload happened (CSS HMR should be hot)
  expect(reloads).toBe(0)

  // Verify host page h1 is STILL blue (MAIN world styles persist, not affected by HMR)
  const pageH1ColorAfter = await pageH1.evaluate(
    (el) => getComputedStyle(el).color,
  )
  expect(pageH1ColorAfter).toBe('rgb(0, 0, 255)')

  // Shadow DOM h1 should now be green after HMR, still isolated from host
  const shadowH1ColorAfter = await crxRoot.evaluate((el) => {
    const h1 = el.shadowRoot?.querySelector('h1')
    return h1 ? getComputedStyle(h1).color : null
  })
  expect(shadowH1ColorAfter).toBe('rgb(0, 128, 0)')
})
