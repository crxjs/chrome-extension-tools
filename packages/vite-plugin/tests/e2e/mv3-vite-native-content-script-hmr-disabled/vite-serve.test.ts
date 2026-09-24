import fs from 'fs-extra'
import path from 'pathe'
import { expect, test } from 'vitest'
import { createUpdate } from '../helpers'
import { serve } from '../runners'

test('liveReload false disables native content script HMR accept', async () => {
  const src = path.join(__dirname, 'src')
  const src1 = path.join(__dirname, 'src1')
  const src2 = path.join(__dirname, 'src2')

  await fs.remove(src)
  await fs.copy(src1, src)

  const { browser } = await serve(__dirname)
  const page = await browser.newPage()
  const app = page.locator('#native-hmr-app')
  const update = createUpdate({ target: src, src: src2 })
  const messages: string[] = []

  page.on('console', (message) => {
    messages.push(`${message.type()}: ${message.text()}`)
  })
  page.on('pageerror', (error) => {
    messages.push(`pageerror: ${error.message}`)
  })

  await page.goto('https://example.com')
  try {
    await app.waitFor({ timeout: 5000 })
  } catch (error) {
    throw new Error(`${error}\n\nBrowser messages:\n${messages.join('\n')}`)
  }
  expect(await app.textContent()).toBe('one')

  await update('content.js')
  await new Promise((resolve) => setTimeout(resolve, 2000))

  expect(await app.textContent()).toBe('one')
})
