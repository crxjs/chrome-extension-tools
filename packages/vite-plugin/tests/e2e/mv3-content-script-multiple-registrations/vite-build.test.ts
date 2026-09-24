import fs from 'fs-extra'
import { join } from 'pathe'
import { expect, test } from 'vitest'
import { build } from '../runners'

// https://github.com/crxjs/chrome-extension-tools/issues/1233
// The same content script declared in multiple content_scripts entries must
// get a web_accessible_resources entry that covers the matches of every
// registration, not just the last one. Otherwise the loader's dynamic import
// is blocked on pages matched only by the other entries and the script
// silently never runs.
test(
  'content script declared in multiple entries runs on all matched pages',
  async () => {
    const { browser, outDir } = await build(__dirname)

    // the WAR matches must be the union of both registrations
    const manifest = await fs.readJson(join(outDir, 'manifest.json'))
    const warMatches = (manifest.web_accessible_resources ?? [])
      .filter((r: { matches?: string[] }) => Array.isArray(r.matches))
      .flatMap((r: { matches: string[] }) => r.matches)
    expect(warMatches).toContain('https://example.com/*')
    expect(warMatches).toContain('https://www.google.com/*')

    // the page is matched only by the first content_scripts entry; the
    // banner only appears if the loader's dynamic import was allowed here
    const page = await browser.newPage()
    await page.goto('https://example.com')

    const banner = page.locator('#multiple-registrations-banner')
    await banner.waitFor({ state: 'attached', timeout: 10000 })
    expect(await banner.textContent()).toBe('content script ran')
  },
  { retry: process.env.CI ? 5 : 0 },
)
