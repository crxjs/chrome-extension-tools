import { test, expect } from 'vitest'
import { getCustomId } from '../helpers'
import { serve } from '../runners'

test(
  'crx runs from server output',
  async (ctx) => {
    const { browser } = await serve(__dirname)
    const page = await browser.newPage()
    await page.goto('https://example.com')

    const app = page.locator('#app')
    await app.waitFor()

    expect(await app.screenshot()).toMatchImageSnapshot({
      customSnapshotIdentifier: getCustomId(ctx),
    })
  },
  { retry: process.env.CI ? 5 : 0 },
)
