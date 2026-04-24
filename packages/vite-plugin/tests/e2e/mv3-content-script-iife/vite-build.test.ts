import fs from 'fs-extra'
import path from 'pathe'
import { expect, test } from 'vitest'
import { build } from '../runners'

test('IIFE content scripts are bundled correctly', async () => {
  const src = path.join(__dirname, 'src')
  const src1 = path.join(__dirname, 'src1')

  await fs.remove(src)
  await fs.copy(src1, src, { recursive: true })

  const { browser, outDir } = await build(__dirname)

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

  // Test that content scripts work in browser
  const page = await browser.newPage()
  await page.goto('https://example.com')
  
  // All 4 content scripts should create their markers
  await page.waitForSelector('#regular-content-script', { timeout: 10000 })
  await page.waitForSelector('#iife-content-script', { timeout: 10000 })
  await page.waitForSelector('#dynamic-regular-script', { timeout: 10000 })
  await page.waitForSelector('#dynamic-iife-script', { timeout: 10000 })

  // Verify content
  const regularText = await page.locator('#regular-content-script').textContent()
  expect(regularText).toBe('regular: shared-util')

  const iifeText = await page.locator('#iife-content-script').textContent()
  expect(iifeText).toBe('iife: shared-util')

  const dynamicRegularText = await page.locator('#dynamic-regular-script').textContent()
  expect(dynamicRegularText).toBe('dynamic-regular: shared-util')

  const dynamicIifeText = await page.locator('#dynamic-iife-script').textContent()
  expect(dynamicIifeText).toBe('dynamic-iife: shared-util')
})
