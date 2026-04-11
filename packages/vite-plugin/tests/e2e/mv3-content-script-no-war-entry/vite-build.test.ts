import fs from 'fs-extra'
import path from 'pathe'
import { expect, test } from 'vitest'
import { build } from '../runners'

test(
  'simple content script entry is not in web_accessible_resources',
  async () => {
    const { browser, outDir } = await build(__dirname)

    // 1. Verify the content script still works in the browser
    const page = await browser.newPage()
    await page.goto('https://example.com')

    const marker = page.locator('#crx-simple-content-script')
    await marker.waitFor({ state: 'attached', timeout: 10000 })
    const text = await marker.textContent()
    expect(text).toBe('Simple content script loaded')

    // 2. Read the built manifest and verify the entry is NOT in web_accessible_resources
    const manifest = await fs.readJson(path.join(outDir, 'manifest.json'))

    // The content script entry should be listed in content_scripts
    expect(manifest.content_scripts).toBeDefined()
    expect(manifest.content_scripts.length).toBe(1)
    const contentScriptFile = manifest.content_scripts[0].js[0]
    expect(contentScriptFile).toBeTruthy()

    // The content script entry should NOT be in web_accessible_resources
    // Per Chrome docs: "Content scripts themselves do not need to be allowed."
    // See: https://github.com/crxjs/chrome-extension-tools/issues/1130
    const warResources = (manifest.web_accessible_resources ?? []).flatMap(
      (war: { resources: string[] }) => war.resources,
    )
    expect(warResources).not.toContain(contentScriptFile)
  },
  { retry: 2 },
)
