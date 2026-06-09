import fs from 'fs-extra'
import path from 'pathe'
import { expect, test } from 'vitest'
import { build } from '../runners'

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
  browser: Awaited<ReturnType<typeof build>>['browser'],
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

test(
  'IIFE MAIN world content script intercepts host fetch and XHR at document_start',
  async () => {
    const src = path.join(__dirname, 'src')
    const src1 = path.join(__dirname, 'src1')
    await fs.emptyDir(src)
    await fs.copy(src1, src, { overwrite: true, recursive: true })

    const { browser, outDir } = await build(__dirname)
    await routeHostPage(browser)

    const manifest = await fs.readJson(path.join(outDir, 'manifest.json'))
    expect(manifest.content_scripts[0].js).toEqual(['src/interceptor.iife.js'])

    const interceptor = await fs.readFile(
      path.join(outDir, 'src/interceptor.iife.js'),
      'utf8',
    )
    expect(interceptor).toMatch(/^\(function\(\)/)
    expect(interceptor).toContain('crx-main-world-iife')
    expect(interceptor).not.toMatch(/^import\s/m)

    const page = await browser.newPage()
    await page.goto('https://example.com')

    const probe = await page.evaluate(() => (window as any).__networkProbe)
    expect(probe).toEqual({
      patchBeforePageScript: 'crx-main-world-iife',
      fetchBeforeCall: null,
      xhrBeforeCall: null,
      fetchAfterCall: 'crx-main-world-iife',
      xhrAfterCall: 'crx-main-world-iife',
    })
  },
  { retry: process.env.CI ? 5 : 0 },
)
