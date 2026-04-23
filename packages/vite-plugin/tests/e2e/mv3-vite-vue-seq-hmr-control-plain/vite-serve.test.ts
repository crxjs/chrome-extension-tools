import fs from 'fs-extra'
import path from 'pathe'
import { chromium, ChromiumBrowserContext } from 'playwright-chromium'
import { afterEach, expect, test } from 'vitest'
import { createServer, ViteDevServer } from 'vite'
import vue from '@vitejs/plugin-vue'
import { createUpdate } from '../helpers'

/**
 * PLAIN-VITE CONTROL (no CRX plugin, no extension, no shadow-DOM).
 *
 * Purpose
 * -------
 * Regression guard that a stock Vite + `@vitejs/plugin-vue` dev server
 * reliably delivers 3 back-to-back `<style scoped>` HMR updates to the
 * same SFC. Originally added to disambiguate whether a "3rd edit is
 * dropped" symptom observed in the CRX shadow-DOM fixture came from
 * Vite core or from CRX's HMR relay.
 *
 * Finding: the drop was fixture-local (src4/ had identical-content
 * copies of App.vue/main.js that `createUpdate` still rewrote, causing
 * chokidar to fire spurious events that raced with the real edit under
 * the extra watcher pressure CRX's fileWriter adds). With a minimal
 * delta fixture (src2+ contain ONLY files that actually differ from
 * src1) both the CRX and plain-Vite versions are stable. Kept as a
 * control so future regressions can be attributed correctly.
 */

let server: ViteDevServer | undefined
let browser: ChromiumBrowserContext | undefined

afterEach(async () => {
  await browser?.close().catch(() => {})
  await server?.close().catch(() => {})
  browser = undefined
  server = undefined
})

async function runOnce() {
  const fixtureDir = __dirname
  const src = path.join(fixtureDir, 'src')
  const src1 = path.join(fixtureDir, 'src1')
  const src2 = path.join(fixtureDir, 'src2')
  const src3 = path.join(fixtureDir, 'src3')
  const src4 = path.join(fixtureDir, 'src4')

  await fs.remove(src)
  await fs.copy(src1, src, { recursive: true })

  // Root = src/ so createUpdate (which only copies *.vue) preserves
  // index.html and main.js across edits.
  server = await createServer({
    root: src,
    configFile: false,
    logLevel: 'error',
    clearScreen: false,
    cacheDir: path.join(fixtureDir, '.vite-cache'),
    server: { port: 0, strictPort: false },
    plugins: [vue()],
  })
  await server.listen()
  const addr = server.httpServer?.address()
  const port = typeof addr === 'object' && addr ? addr.port : 0
  const serverUrl = `http://localhost:${port}`

  const dataDir = path.join(fixtureDir, '.chromium-plain')
  await fs.rm(dataDir, { recursive: true, force: true, maxRetries: 5 })
  browser = (await chromium.launchPersistentContext(dataDir, {
    headless: false,
    args:
      typeof process.env.DEBUG === 'undefined' ? ['--headless=new'] : [],
  })) as ChromiumBrowserContext

  const page = await browser.newPage()
  await page.goto(serverUrl)

  const waitForBg = (rgb: string) =>
    page.waitForFunction(
      (expected) => {
        const btn = document.querySelector('#crx-btn') as HTMLElement | null
        return btn ? getComputedStyle(btn).backgroundColor === expected : false
      },
      rgb,
      { timeout: 20_000 },
    )

  // Initial: red
  await waitForBg('rgb(255, 0, 0)')

  // Edit 1: red -> green
  await createUpdate({ target: src, src: src2 })('vue')
  await new Promise((r) => setTimeout(r, 200))
  await waitForBg('rgb(0, 128, 0)')

  // Edit 2: green -> blue
  await createUpdate({ target: src, src: src3 })('vue')
  await new Promise((r) => setTimeout(r, 200))
  await waitForBg('rgb(0, 0, 255)')

  // Edit 3: blue -> orange  (the one that's dropped in the CRX fixture)
  await createUpdate({ target: src, src: src4 })('vue')
  await new Promise((r) => setTimeout(r, 200))
  await waitForBg('rgb(255, 165, 0)')
}

// Run the 3-edit sequence a few times. Higher counts were used during
// investigation to rule out flakes; a smaller loop is enough in CI.
for (let i = 1; i <= 3; i++) {
  test(
    `plain-vite vue scoped SFC 3 sequential HMR edits - run ${i}`,
    async () => {
      await runOnce()
      expect(true).toBe(true)
    },
    60_000,
  )
}
