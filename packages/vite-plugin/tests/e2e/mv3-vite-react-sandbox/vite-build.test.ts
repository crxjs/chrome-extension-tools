import fs from 'fs-extra'
import path from 'pathe'
import { test } from 'vitest'
import { getCustomId, getPage } from '../helpers'
import { build } from '../runners'
import { expect } from 'vitest'

test('crx runs from build output', async (ctx) => {
  const { browser, outDir } = await build(__dirname)
  const manifest = await fs.readJson(path.join(outDir, 'manifest.json'))
  if (process.env.E2E_BROWSER === 'firefox') {
    const resources: string[] = manifest.web_accessible_resources.flatMap(
      (entry: { resources: string[] }) => entry.resources,
    )
    expect(resources.some((file) => file.endsWith('.js'))).toBe(true)
    expect(
      resources.some(
        (file) => file.includes('*') || file.includes('background'),
      ),
    ).toBe(false)
    for (const file of manifest.background.scripts)
      expect(resources).not.toContain(file)
  } else {
    expect(manifest.web_accessible_resources).toBeUndefined()
  }
  const page = await getPage(browser, 'chrome-extension')

  await page.emulateMedia({ reducedMotion: 'reduce' })
  const app = page.locator('.App')
  await app.waitFor()
  // Rendering must not be achieved by removing sandbox isolation.
  expect(await page.evaluate(() => globalThis.origin)).toBe('null')
  expect(
    await page.evaluate(
      () =>
        typeof chrome === 'undefined' || typeof chrome.runtime === 'undefined',
    ),
  ).toBe(true)

  expect(await app.screenshot()).toMatchImageSnapshot({
    customSnapshotIdentifier: getCustomId(ctx),
  })
})
