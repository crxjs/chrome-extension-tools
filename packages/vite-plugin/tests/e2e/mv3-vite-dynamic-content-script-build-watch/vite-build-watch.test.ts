import fs from 'fs-extra'
import path from 'pathe'
import { test } from 'vitest'
import { createUpdate } from '../helpers'
import { header as initialHeader } from './src1/header'
import { header as updatedHeader } from './src2/header'
import { build } from '../runners'
import { RollupWatcher } from 'rollup'

async function waitForContentAsset(
  outDir: string,
  needle: string,
  { timeout = 15_000, interval = 250 } = {},
): Promise<void> {
  const assetsDir = path.join(outDir, 'assets')
  const deadline = Date.now() + timeout

  while (Date.now() < deadline) {
    const assets = await fs.readdir(assetsDir).catch(() => [] as string[])
    for (const f of assets) {
      if (!f.startsWith('content.ts') || !f.endsWith('.js')) continue
      const source = await fs.readFile(path.join(assetsDir, f), 'utf8')
      if (source.includes(needle)) return
    }
    await new Promise((r) => setTimeout(r, interval))
  }

  throw new Error(
    `Timed out after ${timeout}ms waiting for "${needle}" in watched content asset`,
  )
}

test(
  'crx page update on build --watch',
  async () => {
    const src = path.join(__dirname, 'src')
    const src1 = path.join(__dirname, 'src1')
    const src2 = path.join(__dirname, 'src2')

    await fs.remove(src)
    await fs.copy(src1, src)

    const { output, outDir } = await build(__dirname)

    try {
      await waitForContentAsset(outDir, initialHeader)

      const update = createUpdate({ target: src, src: src2 })

      // update header.ts file -> trigger rebuild
      await update('header.ts')

      // wait for the watch rebuild to complete and produce updated output.
      // Note: in build --watch mode there is no extension auto-reload, so we
      // assert on the produced files rather than the running page.
      await waitForContentAsset(outDir, updatedHeader)
    } finally {
      // Clean up the watcher
      if ('close' in output) {
        ;(output as RollupWatcher).close()
      }
    }
  },
  { retry: 2 },
)
