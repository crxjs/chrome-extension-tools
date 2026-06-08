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

    const { browser, output, outDir } = await build(__dirname)

    const update = createUpdate({ target: src, src: src2 })
    const page = await getPage(browser, 'example.com')

    const app = page.locator('#app')
    await app.waitFor({ timeout: 15_000 })

    // update header.ts file -> trigger rebuild
    await update('header.ts')

    // wait for the watch rebuild to complete and produce updated output.
    // Note: in build --watch mode there is no extension auto-reload, so we
    // assert on the produced files rather than the running page.
    const assetsDir = path.join(outDir, 'assets')
    const deadline = Date.now() + 15_000
    let updated = false
    while (Date.now() < deadline) {
      const assets = await fs.readdir(assetsDir).catch(() => [] as string[])
      for (const f of assets) {
        if (!f.startsWith('content.ts.')) continue
        const source = await fs.readFile(path.join(assetsDir, f), 'utf8')
        if (source.includes(header)) {
          updated = true
          break
        }
      }
      if (updated) break
      await new Promise((r) => setTimeout(r, 250))
    }
    expect(updated).toBe(true)

    // Clean up the watcher
    if ('close' in output) {
      ;(output as RollupWatcher).close()
    }
  },
  { retry: 2 },
)
