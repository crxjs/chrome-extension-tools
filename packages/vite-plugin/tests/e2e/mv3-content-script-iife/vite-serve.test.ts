import fs from 'fs-extra'
import path from 'pathe'
import { expect, test } from 'vitest'
import { serve } from '../runners'
import { iifeContentId, regularContentId } from './src1/script-ids'
import { standaloneIifeScriptId } from './src/script-ids'

test('IIFE content scripts work in dev mode', async () => {
  const src = path.join(__dirname, 'src')
  const src1 = path.join(__dirname, 'src1')

  // emptyDir + overwrite: more reliable than remove+copy when tests run back-to-back
  // (Vite watchers / polling from previous serve() can cause ENOTEMPTY/EEXIST).
  await fs.emptyDir(src)
  await fs.copy(src1, src, { overwrite: true, recursive: true })

  const { browser } = await serve(__dirname)

  const page = await browser.newPage()
  await page.goto('https://example.com')
  
  // In dev mode, .iife.ts files are served as ESM (IIFE bundling only happens in build)
  // But they should still work and create their markers
  
  // Manifest content scripts (regular, .iife.ts convention, and standalone via config)
  await page.waitForSelector(`#${regularContentId}`, { timeout: 10000 })
  await page.waitForSelector(`#${iifeContentId}`, { timeout: 10000 })
  await page.waitForSelector(`#${standaloneIifeScriptId}`, { timeout: 10000 })

  // Verify content
  const regularText = await page.locator(`#${regularContentId}`).textContent()
  expect(regularText).toBe('regular: shared-util')

  const iifeText = await page.locator(`#${iifeContentId}`).textContent()
  expect(iifeText).toBe('iife: shared-util')

  const standaloneText = await page.locator(`#${standaloneIifeScriptId}`).textContent()
  expect(standaloneText).toBe('standalone: shared-util')
  
  // Note: Dynamic content scripts are tested in the build test
  // because chrome.runtime.onInstalled behavior differs in dev mode
})
