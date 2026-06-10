import fs from 'fs-extra'
import path from 'pathe'
import { expect, test } from 'vitest'
import { createUpdate, waitForInnerHtml } from '../helpers'
import { serve } from '../runners'

test('content script uses native Vite HMR over WebSocket', async () => {
  const src = path.join(__dirname, 'src')
  const src1 = path.join(__dirname, 'src1')
  const src2 = path.join(__dirname, 'src2')

  await fs.remove(src)
  await fs.copy(src1, src, { recursive: true })

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

  try {
    await waitForInnerHtml(app, (html) => html.includes('two'))
  } catch (error) {
    throw new Error(
      `${error}\n\nCurrent text: ${await app.textContent()}\n\nBrowser messages:\n${messages.join(
        '\n',
      )}`,
    )
  }
})
