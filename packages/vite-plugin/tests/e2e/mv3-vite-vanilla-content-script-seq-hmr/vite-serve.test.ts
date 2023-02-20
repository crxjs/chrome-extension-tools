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
    plugins: [
      async () => {
        await page.waitForEvent('load')
      },
    ],
  })

  const root = page.locator('#root')
  const h1 = root.locator('h1')
  const h2 = root.locator('h2')

  {
    // load page for the first time
    await page.goto('https://example.com')
    await root.waitFor({ timeout: 100 })

    const text = await root.textContent()
    expect(text).toMatch('first')
    expect(text).toMatch('c1-0')
    expect(text).toMatch('c2-0')
  }

  {
    // update c1.ts -> simple update
    await update('c1.ts')
    await root.waitFor({ timeout: 100 })
    await h1.waitFor({ timeout: 100 })

    const text = await root.textContent()
    expect(text).toMatch('first')
    expect(text).toMatch('c1-1')
    expect(text).toMatch('c2-0')
  }

  {
    // update root file -> update w/ timestamp
    await update('root.ts')
    await root.waitFor({ timeout: 100 })
    await h1.waitFor({ timeout: 100 })

    const text = await root.textContent()
    expect(text).toMatch('first')
    expect(text).toMatch('c1-1')
    expect(text).toMatch('c2-0')
  }

  {
    // update a.ts -> simple update
    await update('a.ts')
    await root.waitFor({ timeout: 100 })
    await h2.waitFor({ timeout: 100 })

    const text = await root.textContent()
    expect(text).toMatch('first')
    expect(text).toMatch('c1-1')
    expect(text).toMatch('c2-0')
  }

  {
    // revert root file -> update w/ timestamp
    await update('root.ts', src1)
    await root.waitFor({ timeout: 100 })
    await h2.waitFor({ timeout: 100 })

    const text = await root.textContent()
    expect(text).toMatch('first')
    expect(text).toMatch('c1-1')
    expect(text).toMatch('c2-0')
  }

  {
    // revert a.ts file -> simple update
    await update('a.ts', src1)
    await root.waitFor({ timeout: 100 })
    await h1.waitFor({ timeout: 100 })

    const text = await root.textContent()
    expect(text).toMatch('first')
    expect(text).toMatch('c1-1')
    expect(text).toMatch('c2-0')
  }

  {
    // update c2.ts file -> simple update
    await update('c2.ts')
    await root.waitFor({ timeout: 100 })
    await h1.waitFor({ timeout: 100 })

    const text = await root.textContent()
    expect(text).toMatch('first')
    expect(text).toMatch('c1-1')
    expect(text).toMatch('c2-1')
  }
})
