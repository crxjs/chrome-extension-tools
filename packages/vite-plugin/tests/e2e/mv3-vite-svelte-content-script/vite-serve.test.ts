import { serve } from '../runners'
import { test, expect } from 'vitest'
import { getCustomId } from '../helpers'

test('crx runs from server output', async (ctx) => {
  const { browser } = await serve(__dirname)
  const page = await browser.newPage()
  await page.goto('https://example.com/')

  const app = page.locator('#crx-app')

  expect(await app.screenshot()).toMatchImageSnapshot({
    customSnapshotIdentifier: getCustomId(ctx),
  })
})
