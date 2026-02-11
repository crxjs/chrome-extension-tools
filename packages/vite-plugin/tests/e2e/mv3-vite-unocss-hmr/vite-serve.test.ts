import fs from 'fs-extra'
import path from 'pathe'
import { expect, test } from 'vitest'
import { createUpdate } from '../helpers'
import { serve } from '../runners'
import { allFilesReady } from 'src/fileWriter-rxjs'

/**
 * This test verifies that UnoCSS virtual CSS modules are properly updated
 * during HMR in Chrome extensions. When a content script is modified with new
 * UnoCSS classes, the styles should update and the CSS file on disk should
 * contain the new classes.
 *
 * Related to: https://github.com/crxjs/chrome-extension-tools/issues/1069
 */
test(
  'unocss styles update on hmr',
  async () => {
    const src = path.join(__dirname, 'src')
    const src1 = path.join(__dirname, 'src1')
    const src2 = path.join(__dirname, 'src2')

    // Start with src1 (red background)
    await fs.remove(src)
    await fs.copy(src1, src, { recursive: true })

    const { browser, outDir } = await serve(__dirname)
    const page = await browser.newPage()
    const update = createUpdate({ target: src, src: src2 })

    await page.goto('https://example.com')

    const unoTest = page.locator('#uno-test')
    await unoTest.waitFor()

    // Check initial state - should have red background class
    const initialClass = await unoTest.getAttribute('class')
    expect(initialClass).toContain('bg-red-500')

    // Find the uno.css file in dist to verify it contains the styles
    const findUnoCss = async (dir: string): Promise<string | undefined> => {
      const files = await fs.readdir(dir)
      for (const file of files) {
        const fullPath = path.join(dir, file)
        const stat = await fs.stat(fullPath)
        if (stat.isDirectory()) {
          const found = await findUnoCss(fullPath)
          if (found) return found
        } else if (file.includes('uno') && file.endsWith('.js')) {
          return fullPath
        }
      }
      return undefined
    }

    const unoCssFile = await findUnoCss(outDir)
    expect(unoCssFile).toBeDefined()

    // Verify initial CSS contains red background
    const initialCss = await fs.readFile(unoCssFile!, 'utf-8')
    expect(initialCss).toContain('bg-red')

    // Update content.ts - this should trigger UnoCSS to regenerate CSS
    // with the new bg-green-500 class
    await update('content.ts')

    // Wait for all files to be written after HMR update
    await allFilesReady()

    // Wait for the file to be updated - need to wait for async write to complete
    // Poll the file until it contains the updated CSS or timeout
    let updatedCss = ''
    for (let i = 0; i < 50; i++) {
      await new Promise((r) => setTimeout(r, 100))
      updatedCss = await fs.readFile(unoCssFile!, 'utf-8')
      if (updatedCss.includes('bg-green')) break
    }

    // The CSS should now contain the new green background class
    // This is the key assertion - verifies HMR updated the virtual CSS file
    expect(updatedCss).toContain('bg-green')
  },
  { retry: process.env.CI ? 5 : 0 },
)
