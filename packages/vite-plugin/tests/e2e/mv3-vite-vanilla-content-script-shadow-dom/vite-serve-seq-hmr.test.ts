import fs from 'fs-extra'
import path from 'pathe'
import { expect, test } from 'vitest'
import { createUpdate } from '../helpers'
import { serve } from '../runners'

/**
 * Regression test for PR #1144 feedback (@nizoio):
 *
 * > "Shadow DOM style changes don't apply on the first attempt...
 * >  updates are always one step behind HMR changes."
 *
 * This test performs multiple sequential CSS edits and asserts that after
 * each edit the color visible inside the shadow root matches the LATEST
 * contents of the CSS file — not the previous edit.
 */
test('shadow dom content script applies sequential CSS HMR updates without lag', async () => {
  const src = path.join(__dirname, 'src')
  const src1 = path.join(__dirname, 'src1') // red   rgb(255, 0, 0)
  const src2 = path.join(__dirname, 'src2') // green rgb(0, 128, 0)
  const src3 = path.join(__dirname, 'src3') // purple rgb(128, 0, 128)

  await fs.emptyDir(src)
  await fs.copy(src1, src)

  const { browser, routes } = await serve(__dirname)

  const page = await browser.newPage()
  await page.goto('https://example.com')

  const crxRoot = page.locator('crx-root')
  await crxRoot.waitFor({ timeout: 10_000 })

  const waitForShadowH1Color = (rgb: string) =>
    page.waitForFunction(
      (expected) => {
        const root = document.querySelector('crx-root')
        const h1 = root?.shadowRoot?.querySelector('h1')
        return h1 ? getComputedStyle(h1).color === expected : false
      },
      rgb,
      { timeout: 10_000 },
    )

  // Initial state: red
  await waitForShadowH1Color('rgb(255, 0, 0)')

  // Track full page reloads; every HMR step below must be hot (no reload).
  let reloads = 0
  routes.subscribe(() => {
    reloads++
  })

  // Step 1: red -> green
  await createUpdate({ target: src, src: src2 })('css')
  await waitForShadowH1Color('rgb(0, 128, 0)')

  // Step 2: green -> purple (this is the step the bug report said would
  // show the PREVIOUS value, i.e. green, instead of purple)
  await createUpdate({ target: src, src: src3 })('css')
  await waitForShadowH1Color('rgb(128, 0, 128)')

  // Step 3: purple -> red (revert) — verifies the "one behind" bug isn't
  // hiding in the reverse direction either.
  await createUpdate({ target: src, src: src1 })('css')
  await waitForShadowH1Color('rgb(255, 0, 0)')

  // Step 4: red -> green again, to catch state that only leaks after
  // multiple cycles through the HMR CSS update path.
  await createUpdate({ target: src, src: src2 })('css')
  await waitForShadowH1Color('rgb(0, 128, 0)')

  // Sanity: no full page reloads happened — all updates should be hot.
  expect(reloads).toBe(0)

  // Host page h1 must remain blue the whole time (MAIN world styles
  // must not leak in or out of shadow DOM across HMR updates).
  const pageH1Color = await page
    .locator('body > h1')
    .evaluate((el) => getComputedStyle(el).color)
  expect(pageH1Color).toBe('rgb(0, 0, 255)')
})
