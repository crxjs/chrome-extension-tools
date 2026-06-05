import fs from 'fs-extra'
import path from 'pathe'
import { expect, test } from 'vitest'
import { waitForRegisteredContentScripts } from '../helpers'
import { build } from '../runners'
import { dynamicBareIifeAliasId, dynamicIifeId, dynamicRegularId } from './src1/dynamic-script-ids'

test(
  'IIFE content scripts are bundled correctly',
  async () => {
  const src = path.join(__dirname, 'src')
  const src1 = path.join(__dirname, 'src1')

  // emptyDir + overwrite: more reliable than remove+copy when tests run back-to-back
  // (Vite watchers / polling from previous serve() can cause ENOTEMPTY/EEXIST).
  await fs.emptyDir(src)
  await fs.copy(src1, src, { overwrite: true, recursive: true })

  const { browser, outDir } = await build(__dirname)

  await waitForRegisteredContentScripts(browser, [
    dynamicRegularId,
    dynamicIifeId,
    dynamicBareIifeAliasId,
  ])

  // Verify the IIFE content script is a single file with inlined imports
  const iifeFile = path.join(outDir, 'src/content-iife.iife.js')
  expect(await fs.pathExists(iifeFile)).toBe(true)
  
  const iifeContent = await fs.readFile(iifeFile, 'utf-8')
  // IIFE should be wrapped in a function
  expect(iifeContent).toMatch(/^\(function\(\)/)
  // Should contain inlined utility code (getMessage function)
  expect(iifeContent).toContain('shared-util')
  // Should NOT have import statements (all inlined)
  expect(iifeContent).not.toMatch(/^import\s/m)

  // Verify regular content script uses loader pattern
  const regularLoaderExists = (await fs.readdir(path.join(outDir, 'assets')))
    .some(f => f.includes('content-regular') && f.includes('loader'))
  expect(regularLoaderExists).toBe(true)

  // Verify dynamic IIFE script is also bundled as IIFE
  const dynamicIifeFile = path.join(outDir, 'src/content-dynamic-iife.iife.js')
  expect(await fs.pathExists(dynamicIifeFile)).toBe(true)
  
  const dynamicIifeContent = await fs.readFile(dynamicIifeFile, 'utf-8')
  expect(dynamicIifeContent).toMatch(/^\(function\(\)/)
  expect(dynamicIifeContent).toContain('shared-util')

  // Verify standalone IIFE (normal .ts filename, declared via defineManifest + contentScripts.standaloneFiles)
  const standaloneIifeFile = path.join(outDir, 'src/content-standalone.js')
  expect(await fs.pathExists(standaloneIifeFile)).toBe(true)
  
  const standaloneIifeContent = await fs.readFile(standaloneIifeFile, 'utf-8')
  expect(standaloneIifeContent).toMatch(/^\(function\(\)/)
  expect(standaloneIifeContent).toContain('shared-util')

  // Verify bare `?iife` alias on a normal-named file (no .iife suffix,
  // not listed in standaloneFiles or manifest) produces an IIFE bundle.
  // This exercises the "via ?iife query string" edge case for a normal filename
  // (alongside filename convention and standaloneFiles in config).
  const bareAliasFile = path.join(outDir, 'src/normal-iife-alias.js')
  expect(await fs.pathExists(bareAliasFile)).toBe(true)
  const bareAliasContent = await fs.readFile(bareAliasFile, 'utf-8')
  expect(bareAliasContent).toMatch(/^\(function\(\)/)
  expect(bareAliasContent).toContain('shared-util')

  // Test that content scripts work in browser
  const page = await browser.newPage()
  await page.goto('https://example.com')
  
  // All 6 content scripts (3 manifest-declared + 3 dynamic) should create their markers.
  // Covers:
  // - IIFE via filename convention (.iife.ts)
  // - IIFE via standaloneFiles in crx config (normal name in defineManifest)
  // - IIFE via bare ?iife query string in import (normal name)
  await page.waitForSelector('#regular-content-script', { timeout: 10000 })
  await page.waitForSelector('#iife-content-script', { timeout: 10000 })
  await page.waitForSelector('#standalone-iife-script', { timeout: 10000 })
  await page.waitForSelector('#dynamic-regular-script', { timeout: 10000 })
  await page.waitForSelector('#dynamic-iife-script', { timeout: 10000 })
  await page.waitForSelector('#bare-iife-alias-script', { timeout: 10000 })

  // Verify content
  const regularText = await page.locator('#regular-content-script').textContent()
  expect(regularText).toBe('regular: shared-util')

  const iifeText = await page.locator('#iife-content-script').textContent()
  expect(iifeText).toBe('iife: shared-util')

  const dynamicRegularText = await page.locator('#dynamic-regular-script').textContent()
  expect(dynamicRegularText).toBe('dynamic-regular: shared-util')

  const dynamicIifeText = await page.locator('#dynamic-iife-script').textContent()
  expect(dynamicIifeText).toBe('dynamic-iife: shared-util')

  const standaloneText = await page.locator('#standalone-iife-script').textContent()
  expect(standaloneText).toBe('standalone: shared-util')

  const bareAliasText = await page.locator('#bare-iife-alias-script').textContent()
  expect(bareAliasText).toBe('bare-iife-alias: shared-util')
  },
  { retry: process.env.CI ? 3 : 0 },
)
