import { expect, test } from 'vitest'
import { serve } from '../runners'

test('Web Components polyfill supports content scripts in dev mode', async () => {
  const { browser } = await serve(__dirname)
  const page = await browser.newPage()

  await page.goto('https://example.com')

  const customElement = page.locator('#custom-element-result')
  await customElement.waitFor({ state: 'attached' })

  expect(await customElement.getAttribute('data-upgraded')).toBe('true')
  expect(await customElement.textContent()).toBe('upgraded')

  const result = page.locator('#document-clone-node-result')
  await result.waitFor({ state: 'attached' })

  expect(await result.getAttribute('data-status')).toBe('ok')
  expect(await result.textContent()).toBe('')
})
