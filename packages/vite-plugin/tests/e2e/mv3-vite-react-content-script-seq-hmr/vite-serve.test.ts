import fs from 'fs-extra'
import path from 'pathe'
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

  const waitForText = (text: string) =>
    page.waitForFunction(
      (text: string) => {
        const app = document.querySelector('#app')
        return app?.textContent?.includes(text)
      },
      text,
      { timeout: 15_000 },
    )

  const root = page.locator('#root')
  const app = root.locator('#app')
  const a = app.locator('.A')
  const b = app.locator('.B')
  const c1 = app.locator('.A + .C')
  const c2 = app.locator('.B + .C')

  {
    // load page for the first time
    await page.goto('https://example.com')
    await root.waitFor()
    await app.waitFor()
    await a.waitFor()
    await b.waitFor()
    await c1.waitFor()
    await c2.waitFor()

    expect(await a.textContent()).toMatch('a-0')
    expect(await b.textContent()).toMatch('b-0')
    expect(await c1.textContent()).toMatch('c-0-0')
    expect(await c2.textContent()).toMatch('c-0-0')
  }

  {
    await c1.click()
    await waitForText('c-0-1')

    expect(await c1.textContent()).toMatch('c-0-1')
    expect(await c2.textContent()).toMatch('c-0-1')
  }

  {
    // update c1.jsx -> simple update
    await update('C.jsx')
    await waitForText('c-1')

    expect(await a.textContent()).toMatch('a-0')
    expect(await b.textContent()).toMatch('b-0')
    expect(await c1.textContent()).toMatch('c-1-0')
    expect(await c2.textContent()).toMatch('c-1-0')
  }

  {
    await c1.click()
    await waitForText('c-1-1')

    expect(await c1.textContent()).toMatch('c-1-1')
    expect(await c2.textContent()).toMatch('c-1-1')
  }

  {
    // update c1.jsx -> simple update
    await update('A.jsx')
    await waitForText('a-1')

    expect(await a.textContent()).toMatch('a-1')
    expect(await b.textContent()).toMatch('b-0')
    expect(await c1.textContent()).toMatch('c-1-1')
    expect(await c2.textContent()).toMatch('c-1-1')
  }

  {
    // update c1.jsx -> simple update
    await update('B.jsx')
    await waitForText('b-1')

    expect(await a.textContent()).toMatch('a-1')
    expect(await b.textContent()).toMatch('b-1')
    expect(await c1.textContent()).toMatch('c-1-1')
    expect(await c2.textContent()).toMatch('c-1-1')
  }

  {
    // update C.jsx -> revert C
    await update('C.jsx', src1)
    await waitForText('c-0')

    expect(await a.textContent()).toMatch('a-1')
    expect(await b.textContent()).toMatch('b-1')
    expect(await c1.textContent()).toMatch('c-0-0')
    expect(await c2.textContent()).toMatch('c-0-0')
  }

  {
    await c1.click()
    await waitForText('c-0-1')

    expect(await c1.textContent()).toMatch('c-0-1')
    expect(await c2.textContent()).toMatch('c-0-1')
  }

  {
    // update B.jsx -> revert B
    await update('B.jsx', src1)
    await waitForText('b-0')

    expect(await a.textContent()).toMatch('a-1')
    expect(await b.textContent()).toMatch('b-0')
    expect(await c1.textContent()).toMatch('c-0-1')
    expect(await c2.textContent()).toMatch('c-0-1')
  }
})
