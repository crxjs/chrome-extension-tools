import { expect, test } from 'vitest'
import { build } from '../runners'

test('content script export runs when script is injected', async () => {
  const { browser } = await build(__dirname)
  const page = await browser.newPage()

  const root = page.locator('#root')

  // load page for the first time
  await page.goto('https://example.com')
  await page.waitForSelector('#root[data-injected="1"]')
  expect(await root.textContent()).toBe('injected 1x')

  await root.click()
  await page.waitForSelector('#root[data-injected="2"]')
  await expect(await root.textContent()).toBe('injected 2x')
})
