import fs from 'fs-extra'
import path from 'pathe'
import { expect, test } from 'vitest'
import { serve } from '../runners'

test('IIFE content scripts work in dev mode', async () => {
  const src = path.join(__dirname, 'src')
  const src1 = path.join(__dirname, 'src1')

  await fs.remove(src)
  await fs.copy(src1, src, { recursive: true })

  const { browser } = await serve(__dirname)

  const page = await browser.newPage()
  await page.goto('https://example.com')
  
  // In dev mode, .iife.ts files are served as ESM (IIFE bundling only happens in build)
  // But they should still work and create their markers
  
  // Manifest content scripts (both regular and .iife.ts)
  await page.waitForSelector('#regular-content-script', { timeout: 10000 })
  await page.waitForSelector('#iife-content-script', { timeout: 10000 })

  // Verify content
  const regularText = await page.locator('#regular-content-script').textContent()
  expect(regularText).toBe('regular: shared-util')

  const iifeText = await page.locator('#iife-content-script').textContent()
  expect(iifeText).toBe('iife: shared-util')
  
  // Note: Dynamic content scripts are tested in the build test
  // because chrome.runtime.onInstalled behavior differs in dev mode
})
