import { test } from 'vitest'
import { serve } from '../runners'

test(
  'crx runs from server output',
  async () => {
    const { browser } = await serve(__dirname)
    const page = await browser.newPage()
    const container = page.locator('div.container')
    const font = container.locator('.tags.font')
    const image = container.locator('.tags.image')
    const script = container.locator('.tags.script')

    await page.goto('https://example.com')
    await font.waitFor({ state: 'attached' })
    await image.waitFor({ state: 'attached' })
    await script.waitFor({ state: 'attached' })
  },
  { retry: process.env.CI ? 5 : 0 },
)
