import fs from 'fs-extra'
import path from 'pathe'
import type { Page } from 'playwright-chromium'
import { expect, test } from 'vitest'
import { createUpdate, waitForFileContent } from '../helpers'
import { serve } from '../runners'

const hostPage = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <script>
      window.__networkProbe = {
        patchBeforePageScript: window.__crxPatchInstalledBy || null,
        fetchBeforeCall: window.__crxFetchInterceptedBy || null,
        xhrBeforeCall: window.__crxXhrInterceptedBy || null
      };

      fetch('/intercepted-fetch').catch(() => {});

      const xhr = new XMLHttpRequest();
      xhr.open('GET', '/intercepted-xhr');
      xhr.send();

      window.__networkProbe.fetchAfterCall = window.__crxFetchInterceptedBy || null;
      window.__networkProbe.xhrAfterCall = window.__crxXhrInterceptedBy || null;
    </script>
  </head>
  <body>
    <h1>Network intercept host page</h1>
  </body>
</html>`

async function routeHostPage(
  browser: Awaited<ReturnType<typeof serve>>['browser'],
) {
  await browser.unroute('https://example.com')
  await browser.route(/^https:\/\/example\.com\/?$/, async (route) => {
    await route.fulfill({
      body: hostPage,
      contentType: 'text/html',
    })
  })
  await browser.route(
    'https://example.com/intercepted-fetch',
    async (route) => {
      await route.fulfill({
        body: JSON.stringify({ ok: true }),
        contentType: 'application/json',
      })
    },
  )
  await browser.route('https://example.com/intercepted-xhr', async (route) => {
    await route.fulfill({
      body: JSON.stringify({ ok: true }),
      contentType: 'application/json',
    })
  })
}

async function expectNetworkProbe(page: Page, marker: string) {
  const probe = await page.evaluate(() => (window as any).__networkProbe)
  expect(probe).toEqual({
    patchBeforePageScript: marker,
    fetchBeforeCall: null,
    xhrBeforeCall: null,
    fetchAfterCall: marker,
    xhrAfterCall: marker,
  })
}

test(
  'IIFE MAIN world content script intercepts host fetch and XHR at document_start in dev mode',
  async () => {
    const src = path.join(__dirname, 'src')
    const src1 = path.join(__dirname, 'src1')
    await fs.emptyDir(src)
    await fs.copy(src1, src, { overwrite: true })

    const { browser, outDir } = await serve(__dirname)
    await routeHostPage(browser)

    const manifest = await fs.readJson(path.join(outDir, 'manifest.json'))
    const [scriptPath] = manifest.content_scripts[0].js
    expect(scriptPath).toBe('src/interceptor.iife.ts.iife.js')
    expect(scriptPath).not.toContain('loader')
    expect(await fs.pathExists(path.join(outDir, scriptPath))).toBe(true)

    const page = await browser.newPage()
    await page.goto('https://example.com')

    await expectNetworkProbe(page, 'crx-main-world-iife')
  },
  { retry: process.env.CI ? 5 : 0 },
)

test(
  'manifest-declared IIFE content script rebuilds on change and works after page reload',
  async () => {
    const src = path.join(__dirname, 'src')
    const src1 = path.join(__dirname, 'src1')
    const src2 = path.join(__dirname, 'src2')
    await fs.emptyDir(src)
    await fs.copy(src1, src, { overwrite: true })

    const { browser, outDir } = await serve(__dirname)
    await routeHostPage(browser)

    const manifest = await fs.readJson(path.join(outDir, 'manifest.json'))
    const [scriptPath] = manifest.content_scripts[0].js
    const scriptFile = path.join(outDir, scriptPath)
    expect(scriptPath).toBe('src/interceptor.iife.ts.iife.js')
    expect(await fs.pathExists(scriptFile)).toBe(true)

    const page = await browser.newPage()
    await page.goto('https://example.com')
    await expectNetworkProbe(page, 'crx-main-world-iife')

    const update = createUpdate({ target: src, src: src2 })
    await update('interceptor.iife.ts')
    await waitForFileContent(
      scriptFile,
      (content) => content.includes('crx-main-world-iife-updated'),
      { timeout: 30000 },
    )
    await page.reload({ waitUntil: 'load' })

    await expectNetworkProbe(page, 'crx-main-world-iife-updated')
  },
  { retry: process.env.CI ? 5 : 0 },
)
