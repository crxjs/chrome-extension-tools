import { test } from 'vitest'
import { serve } from '../runners'
import { expect } from 'vitest'
import { getCustomId } from '../helpers'

test(
  'crx runs from server output',
  async (ctx) => {
    const { browser } = await serve(__dirname)
    const page = await browser.newPage()
    await page.goto('https://example.com')
    await page.emulateMedia({ reducedMotion: 'reduce' })

    const app = page.locator('.App')
    await app.waitFor()

    expect(await app.screenshot()).toMatchImageSnapshot({
      customSnapshotIdentifier: getCustomId(ctx),
    })
  },
  { retry: process.env.CI ? 5 : 0 },
)
