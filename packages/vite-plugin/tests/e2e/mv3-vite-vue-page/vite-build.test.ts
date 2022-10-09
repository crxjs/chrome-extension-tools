import { expect, test } from 'vitest'
import { getCustomId, getPage } from '../helpers'
import { build } from '../runners'

test('crx runs from build output', async (ctx) => {
  const { browser } = await build(__dirname)
  const page = await getPage(browser, 'chrome-extension')

  const app = page.locator('#app')
  await app.locator('img').waitFor()

  expect(await app.screenshot()).toMatchImageSnapshot({
    customSnapshotIdentifier: getCustomId(ctx),
  })
})
