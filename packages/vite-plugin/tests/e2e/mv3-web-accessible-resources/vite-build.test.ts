import { test } from 'vitest'
import { build } from '../runners'

test('crx runs from build output', async () => {
  const { browser } = await build(__dirname)
  const page = await browser.newPage()
  const container = page.locator('div.container')
  const font = container.locator('.tags.font')
  const image = container.locator('.tags.image')
  const script = container.locator('.tags.script')

  await page.goto('https://example.com')
  await font.waitFor({ state: 'attached' })
  await image.waitFor({ state: 'attached' })
  await script.waitFor({ state: 'attached' })
})
