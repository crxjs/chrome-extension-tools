import { test } from 'vitest'
import { getCustomId, getPage } from '../helpers'
import { serve } from '../runners'

test.skip(
  'crx runs from server output',
  async (ctx) => {
    const { browser } = await serve(__dirname)

    // the page fails to load with a SIGTRAP error
    const page = await getPage(browser, 'chrome-extension')

    await page.emulateMedia({ reducedMotion: 'reduce' })
    const app = page.locator('.App')
    await app.waitFor()

    expect(await app.screenshot()).toMatchImageSnapshot({
      customSnapshotIdentifier: getCustomId(ctx),
    })
  },
  { retry: process.env.CI ? 5 : 0 },
)
