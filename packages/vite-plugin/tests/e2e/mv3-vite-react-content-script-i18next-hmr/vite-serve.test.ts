import fs from 'fs-extra'
import path from 'pathe'
import { expect, test } from 'vitest'
import { createUpdate, waitForFileContent } from '../helpers'
import { serve } from '../runners'

const fixture = {
  src: path.join(__dirname, 'src'),
  src1: path.join(__dirname, 'src1'),
  src2: path.join(__dirname, 'src2'),
}

async function resetSource() {
  await fs.remove(fixture.src)
  await fs.copy(fixture.src1, fixture.src)
}

test(
  'updates react-i18next translations through HMR',
  async () => {
    await resetSource()

    const { browser } = await serve(__dirname)
    const page = await browser.newPage()
    const update = createUpdate({
      target: fixture.src,
      src: fixture.src2,
    })

    await page.goto('https://example.com')

    const translation = page.locator('[data-testid="translation"]')
    await translation.filter({ hasText: 'Translation before update' }).waitFor()

    let reloaded = false
    page.on('framenavigated', () => {
      reloaded = true
    })

    await update('pl.json')

    await translation.filter({ hasText: 'Translation after update' }).waitFor({
      timeout: 15_000,
    })
    expect(reloaded).toBe(false)
  },
  { retry: process.env.CI ? 5 : 0 },
)

test(
  'loads updated react-i18next translations after a page reload without restarting Vite',
  async () => {
    process.env.CRXJS_TEST_I18NEXT_LIVE_RELOAD = 'false'

    try {
      await resetSource()

      const { browser, outDir } = await serve(__dirname)
      const page = await browser.newPage()
      const update = createUpdate({
        target: fixture.src,
        src: fixture.src2,
      })

      await page.goto('https://example.com')

      const translation = page.locator('[data-testid="translation"]')
      await translation
        .filter({ hasText: 'Translation before update' })
        .waitFor()

      await update('pl.json')
      await waitForFileContent(
        path.join(outDir, 'src/locales/pl.json__import.js'),
        (content) => content.includes('Translation after update'),
        { timeout: 15_000 },
      )

      expect(await translation.textContent()).toBe('Translation before update')

      await page.reload()
      await translation
        .filter({ hasText: 'Translation after update' })
        .waitFor()
    } finally {
      delete process.env.CRXJS_TEST_I18NEXT_LIVE_RELOAD
    }
  },
  { retry: process.env.CI ? 5 : 0 },
)
