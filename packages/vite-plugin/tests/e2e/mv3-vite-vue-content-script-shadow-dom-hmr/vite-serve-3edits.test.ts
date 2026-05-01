import fs from 'fs-extra'
import path from 'pathe'
import { expect, test } from 'vitest'
import { createUpdate } from '../helpers'
import { serve } from '../runners'

/**
 * Three back-to-back `<style scoped>` edits to the same Vue SFC
 * in a shadow-DOM content script. Verifies the fix in
 * plugin-fileWriter-polyfill.ts (route writes past Vite's sheetsMap
 * reuse) holds past the 2-edit boundary.
 *
 * Fixture hygiene: src2/, src3/, src4/ must contain ONLY files whose
 * content actually differs from src1/. An identical-content same-name
 * file (e.g. a stray src4/App.vue copied from src1/) gets rewritten by
 * `createUpdate`'s `fs.copy`, bumps its mtime, and provokes a chokidar
 * event for a file Vite sees as unchanged. The resulting
 * handleHotUpdate for the unchanged module races with the real one and
 * Vite's HMR coalescing silently drops the real update. See helpers.ts.
 */
test(
  'CRX 3rd sequential Vue SFC HMR edit updates shadow-DOM style',
  async () => {
    const src = path.join(__dirname, 'src')
    const src1 = path.join(__dirname, 'src1') // red    rgb(255, 0, 0)
    const src2 = path.join(__dirname, 'src2') // green  rgb(0, 128, 0)
    const src3 = path.join(__dirname, 'src3') // blue   rgb(0, 0, 255)
    const src4 = path.join(__dirname, 'src4') // orange rgb(255, 165, 0)

    await fs.remove(src)
    await fs.copy(src1, src, { recursive: true })

    const { browser, routes } = await serve(__dirname)
    const page = await browser.newPage()
    await page.goto('https://example.com')

    const crxRoot = page.locator('crx-root')
    await crxRoot.waitFor({ timeout: 15_000 })

    const waitForShadowButtonBg = (rgb: string) =>
      page.waitForFunction(
        (expected) => {
          const root = document.querySelector('crx-root')
          const btn = root?.shadowRoot?.querySelector(
            '#crx-btn',
          ) as HTMLElement | null
          return btn
            ? getComputedStyle(btn).backgroundColor === expected
            : false
        },
        rgb,
        { timeout: 30_000 },
      )

    await waitForShadowButtonBg('rgb(255, 0, 0)')

    let reloads = 0
    routes.subscribe(() => {
      reloads++
    })

    await createUpdate({ target: src, src: src2 })('vue')
    await new Promise((r) => setTimeout(r, 200))
    await waitForShadowButtonBg('rgb(0, 128, 0)')

    await createUpdate({ target: src, src: src3 })('vue')
    await new Promise((r) => setTimeout(r, 200))
    await waitForShadowButtonBg('rgb(0, 0, 255)')

    await createUpdate({ target: src, src: src4 })('vue')
    await new Promise((r) => setTimeout(r, 200))
    await waitForShadowButtonBg('rgb(255, 165, 0)')

    expect(reloads).toBe(0)
  },
)
