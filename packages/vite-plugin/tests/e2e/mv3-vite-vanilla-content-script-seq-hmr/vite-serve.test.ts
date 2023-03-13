import fs from 'fs-extra'
import path from 'path'
import { expect, test } from 'vitest'
import { createUpdate } from '../helpers'
import { serve } from '../runners'

test('crx page update on hmr', async () => {
  const src = path.join(__dirname, 'src')
  const src1 = path.join(__dirname, 'src1')
  const src2 = path.join(__dirname, 'src2')

  await fs.remove(src)
  await fs.copy(src1, src, { recursive: true })

  const { browser } = await serve(__dirname)
  const page = await browser.newPage()
  const update = createUpdate({
    target: src,
    src: src2,
  })

  const root = page.locator('#root')
  const app = root.locator("#app")
  const a = 

  {
    // load page for the first time
    await page.goto('https://example.com')
    await root.waitFor({ timeout: 100 })

    const text = await root.textContent()
    // original values
    expect(text).toMatch('a-0')
    expect(text).toMatch('b-0')
    expect(text).toMatch('c-0')
  }
  
  {
    // update c1.ts -> simple update
    await update('C.ts')
    await root.waitFor({ timeout: 100 })

    const text = await root.textContent()
    expect(text).toMatch('a-0')
    expect(text).toMatch('b-0')
    // changed value from c1
    expect(text).toMatch('c-1')
  }
  
  {
    // update c1.ts -> simple update
    await update('C.ts')
    await root.waitFor({ timeout: 100 })

    const text = await root.textContent()
    expect(text).toMatch('a-0')
    expect(text).toMatch('b-0')
    // changed value from c1
    expect(text).toMatch('c-1')
  }
})
