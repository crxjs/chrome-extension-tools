import { test } from 'vitest'
import { build } from '../runners'
import { expect } from 'vitest'
import { getCustomId } from '../helpers'

test('crx runs from build output', async (ctx) => {
  const { browser } = await build(__dirname)
  const page = await browser.newPage()
  await page.goto('https://example.com')

  await page.emulateMedia({ reducedMotion: 'reduce' })

  const app = page.locator('.App')

  await app.waitFor()

  expect(await app.screenshot()).toMatchImageSnapshot({
    customSnapshotIdentifier: getCustomId(ctx),
  })
})
