import fs from 'fs-extra'
import path from 'pathe'
import { expect, test } from 'vitest'
import {
  createUpdate,
  waitForContentScriptContent,
  waitForRegisteredContentScripts,
} from '../helpers'
import { serve } from '../runners'
import {
  expectNetworkProbe,
  expectRegisteredDynamicScript,
  routeHostPage,
} from './test-helpers'
import { dynamicNetworkScriptId } from './src1/script-ids'

test(
  'dynamic IIFE MAIN world content script intercepts host fetch and XHR at document_start in dev mode',
  async () => {
    const src = path.join(__dirname, 'src')
    const src1 = path.join(__dirname, 'src1')
    await fs.emptyDir(src)
    await fs.copy(src1, src, { overwrite: true })

    const { browser, outDir } = await serve(__dirname)
    await waitForRegisteredContentScripts(
      browser,
      [dynamicNetworkScriptId],
      { timeout: 30000 },
    )
    const scriptPath = await expectRegisteredDynamicScript(browser)
    expect(scriptPath).toBe('src/interceptor.iife.ts.iife.js')
    expect(await fs.pathExists(path.join(outDir, scriptPath))).toBe(true)

    await routeHostPage(browser)

    const page = await browser.newPage()
    await page.goto('https://example.com')

    await expectNetworkProbe(page)
  },
  { retry: process.env.CI ? 5 : 0 },
)

test(
  'dynamic IIFE MAIN world content script rebuilds on change and works after page reload',
  async () => {
    const src = path.join(__dirname, 'src')
    const src1 = path.join(__dirname, 'src1')
    const src2 = path.join(__dirname, 'src2')
    await fs.emptyDir(src)
    await fs.copy(src1, src, { overwrite: true })

    const { browser, outDir } = await serve(__dirname)
    await waitForRegisteredContentScripts(
      browser,
      [dynamicNetworkScriptId],
      { timeout: 30000 },
    )
    const scriptPath = await expectRegisteredDynamicScript(browser)
    expect(scriptPath).toBe('src/interceptor.iife.ts.iife.js')
    expect(await fs.pathExists(path.join(outDir, scriptPath))).toBe(true)

    await routeHostPage(browser)

    const page = await browser.newPage()
    await page.goto('https://example.com')

    await expectNetworkProbe(page)

    const update = createUpdate({ target: src, src: src2 })
    await update('interceptor.iife.ts')
    await waitForContentScriptContent(
      browser,
      outDir,
      dynamicNetworkScriptId,
      'crx-dynamic-main-world-iife-updated',
      { timeout: 30000 },
    )
    await waitForRegisteredContentScripts(
      browser,
      [dynamicNetworkScriptId],
      { timeout: 30000 },
    )
    await page.reload({ waitUntil: 'load' })

    await expectNetworkProbe(page, 'crx-dynamic-main-world-iife-updated')
  },
  { retry: process.env.CI ? 5 : 0 },
)
