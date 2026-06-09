import fs from 'fs-extra'
import path from 'pathe'
import { expect, test } from 'vitest'
import { waitForRegisteredContentScripts } from '../helpers'
import { build } from '../runners'
import {
  expectNetworkProbe,
  expectRegisteredDynamicScript,
  routeHostPage,
} from './test-helpers'
import { dynamicNetworkScriptId } from './src1/script-ids'

test(
  'dynamic IIFE MAIN world content script intercepts host fetch and XHR at document_start',
  async () => {
    const src = path.join(__dirname, 'src')
    const src1 = path.join(__dirname, 'src1')
    await fs.emptyDir(src)
    await fs.copy(src1, src, { overwrite: true, recursive: true })

    const { browser, outDir } = await build(__dirname)
    await waitForRegisteredContentScripts(
      browser,
      [dynamicNetworkScriptId],
      { timeout: 30000 },
    )
    const scriptPath = await expectRegisteredDynamicScript(browser)
    expect(await fs.pathExists(path.join(outDir, scriptPath))).toBe(true)

    const interceptor = await fs.readFile(path.join(outDir, scriptPath), 'utf8')
    expect(interceptor).toMatch(/^\(function\(\)/)
    expect(interceptor).toContain('crx-dynamic-main-world-iife')
    expect(interceptor).not.toMatch(/^import\s/m)

    await routeHostPage(browser)

    const page = await browser.newPage()
    await page.goto('https://example.com')

    await expectNetworkProbe(page)
  },
  { retry: process.env.CI ? 5 : 0 },
)
