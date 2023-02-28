import { build } from '../runners'
import { test, expect } from 'vitest'
import { getCustomId } from '../helpers'

test(
  'crx runs from build output',
  async (ctx) => {
    const { browser } = await build(__dirname)
    const page = await browser.newPage()
    await page.goto('http://www.google.com')

    const app = page.locator('#crx-app')
    await app.locator('img').waitFor()

    expect(await app.screenshot()).toMatchImageSnapshot({
      customSnapshotIdentifier: getCustomId(ctx),
    })
  },
  { retry: 2 },
)
