import fs from 'fs-extra'
import path from 'pathe'
import { expect, test } from 'vitest'
import { waitForRegisteredContentScripts } from '../helpers'
import { serve } from '../runners'
import { bareIifeAliasScriptId, dynamicBareIifeAliasId, dynamicIifeId, dynamicRegularId, iifeContentId, regularContentId, standaloneIifeScriptId } from './src1/script-ids'

test('IIFE content scripts work in dev mode', async () => {
  const src = path.join(__dirname, 'src')
  const src1 = path.join(__dirname, 'src1')

  // emptyDir + overwrite: more reliable than remove+copy when tests run back-to-back
  // (Vite watchers / polling from previous serve() can cause ENOTEMPTY/EEXIST).
  await fs.emptyDir(src)
  await fs.copy(src1, src, { overwrite: true })

  const { browser } = await serve(__dirname)

  await waitForRegisteredContentScripts(browser, [
    dynamicRegularId,
    dynamicIifeId,
    dynamicBareIifeAliasId,
  ])

  const page = await browser.newPage()
  await page.goto('https://example.com')

  // In dev mode, .iife.ts files are served as ESM (IIFE bundling only happens in build)
  // but should still execute and create their markers.
  await page.waitForSelector(`#${regularContentId}`, { timeout: 10000 })
  await page.waitForSelector(`#${iifeContentId}`, { timeout: 10000 })
  await page.waitForSelector(`#${standaloneIifeScriptId}`, { timeout: 10000 })
  await page.waitForSelector(`#${dynamicRegularId}`, { timeout: 10000 })
  await page.waitForSelector(`#${dynamicIifeId}`, { timeout: 10000 })
  await page.waitForSelector(`#${bareIifeAliasScriptId}`, { timeout: 10000 })

  const regularText = await page.locator(`#${regularContentId}`).textContent()
  expect(regularText).toBe('regular: shared-util')

  const iifeText = await page.locator(`#${iifeContentId}`).textContent()
  expect(iifeText).toBe('iife: shared-util')

  const standaloneText = await page.locator(`#${standaloneIifeScriptId}`).textContent()
  expect(standaloneText).toBe('standalone: shared-util')

  const dynamicRegularText = await page.locator(`#${dynamicRegularId}`).textContent()
  expect(dynamicRegularText).toBe('dynamic-regular: shared-util')

  const dynamicIifeText = await page.locator(`#${dynamicIifeId}`).textContent()
  expect(dynamicIifeText).toBe('dynamic-iife: shared-util')

  const bareAliasText = await page.locator(`#${bareIifeAliasScriptId}`).textContent()
  expect(bareAliasText).toBe('bare-iife-alias: shared-util')
})
