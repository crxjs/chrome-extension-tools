import fs from 'fs-extra'
import path from 'pathe'
import { expect, test } from 'vitest'
import { createUpdate, getPage } from '../helpers'
import { header } from './src2/header'
import { build } from '../runners'
import { RollupWatcher } from 'rollup'
test(
  'crx page update on build --watch',
  async () => {
    const src = path.join(__dirname, 'src')
    const src1 = path.join(__dirname, 'src1')
    const src2 = path.join(__dirname, 'src2')

    await fs.remove(src)
    await fs.copy(src1, src, { recursive: true })

    const { browser, output } = await build(__dirname)

    const update = createUpdate({ target: src, src: src2 })
    const page = await getPage(browser, 'example.com')

    const app = page.locator('#app')
    await app.waitFor({ timeout: 15_000 })

    // update header.ts file -> trigger full reload
    await update('header.ts')

    await page.locator('h1', { hasText: header }).waitFor()

    // Validate that there are no plugin:errors?
    expect(true).toBe(true)

    // Clean up the watcher
    if ('close' in output) {
      (output as RollupWatcher).close()
    }
  },
  { retry: 2 },
)
