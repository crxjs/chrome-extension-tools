import fs from 'fs-extra'
import path from 'pathe'
import { expect, test } from 'vitest'
import { createUpdate, waitForInnerHtml } from '../helpers'
import { serve } from '../runners'

/**
 * This test verifies that virtual CSS modules (like UnoCSS's __uno.css) are
 * properly updated during HMR. The issue is that when using atomic CSS
 * frameworks, styles can become invalid and only work after deleting
 * node_modules.
 *
 * Related to: https://github.com/crxjs/chrome-extension-tools/issues/1069
 */
test.skipIf(process.env.CI)('virtual css module updates on hmr', async () => {
  const src = path.join(__dirname, 'src')
  const src1 = path.join(__dirname, 'src1')
  const src2 = path.join(__dirname, 'src2')

  // Start with src1
  await fs.remove(src)
  await fs.copy(src1, src, { recursive: true })

  const { browser, outDir, devServer } = await serve(__dirname)

  const page = await browser.newPage()
  const update = createUpdate({ target: src, src: src2 })

  await page.goto('https://example.com')

  const app = page.locator('#app')
  await app.waitFor()

  // Check that initial virtual CSS is applied
  const styles = page.locator('head style')
  await waitForInnerHtml(styles, (h) => h.includes('text-red'))

  // Find the virtual CSS file in dist using glob
  const findVirtualCss = async (dir: string): Promise<string | undefined> => {
    const files = await fs.readdir(dir)
    for (const file of files) {
      const fullPath = path.join(dir, file)
      const stat = await fs.stat(fullPath)
      if (stat.isDirectory()) {
        const found = await findVirtualCss(fullPath)
        if (found) return found
      } else if (file.includes('uno') && file.endsWith('.js')) {
        return fullPath
      }
    }
    return undefined
  }

  const virtualCssFile = await findVirtualCss(outDir)
  expect(virtualCssFile).toBeDefined()

  const initialCssContent = await fs.readFile(virtualCssFile!, 'utf-8')
  expect(initialCssContent).toContain('text-red')
  expect(initialCssContent).not.toContain('text-green')

  console.log('Initial CSS content verified, now updating content.ts...')

  // Update content.ts - this should trigger virtual CSS regeneration
  await update('content.ts')

  console.log('content.ts updated, waiting for file to be updated in dist...')

  // Wait a bit for the file to be written
  await new Promise((r) => setTimeout(r, 2000))

  // Read the file again to check if it was updated
  const updatedCssContentFromFile = await fs.readFile(virtualCssFile!, 'utf-8')
  console.log(
    'Updated CSS file content:',
    updatedCssContentFromFile.substring(0, 500),
  )

  // Check if the file was actually updated
  const fileWasUpdated = updatedCssContentFromFile.includes('text-green')
  console.log('File was updated:', fileWasUpdated)

  // The virtual CSS should now contain the new classes - THIS IS THE KEY ASSERTION
  expect(updatedCssContentFromFile).toContain('text-green')
  expect(updatedCssContentFromFile).toContain('mt-4')

  await devServer.close()
})
