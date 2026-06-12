import fs from 'fs-extra'
import path from 'pathe'
import { expect, test } from 'vitest'
import { createUpdate } from '../helpers'
import { serve } from '../runners'

test('hmr updates two content scripts and a shared dependency at once', async () => {
  const src = path.join(__dirname, 'src')
  const src1 = path.join(__dirname, 'src1')
  const src2 = path.join(__dirname, 'src2')

  await fs.remove(src)
  await fs.copy(src1, src, { recursive: true })

  const { browser } = await serve(__dirname)
  const page = await browser.newPage()
  const update = createUpdate({ target: src, src: src2 })

  await page.goto('https://example.com')

  const oneApp = page.locator('#one-app')
  const twoApp = page.locator('#two-app')
  await oneApp.filter({ hasText: 'one ready: entry v1: shared v1' }).waitFor()
  await twoApp.filter({ hasText: 'two ready: entry v1: shared v1' }).waitFor()

  let reloaded = false
  page.on('framenavigated', () => {
    reloaded = true
  })

  await update('jsx')

  await oneApp.filter({ hasText: 'one ready: entry v2: shared v2' }).waitFor()
  await twoApp.filter({ hasText: 'two ready: entry v2: shared v2' }).waitFor()

  expect(reloaded).toBe(false)
})
