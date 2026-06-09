import type { BrowserContext, Page } from 'playwright-chromium'
import { expect } from 'vitest'
import { getServiceWorker } from '../helpers'
import { dynamicNetworkScriptId } from './src1/script-ids'

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
    <h1>Dynamic network intercept host page</h1>
  </body>
</html>`

export async function routeHostPage(browser: BrowserContext) {
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

export async function expectRegisteredDynamicScript(
  browser: BrowserContext,
): Promise<string> {
  const sw = await getServiceWorker(browser, { timeout: 15000 })
  if (!sw) throw new Error('Timed out waiting for background service worker')

  const script = await sw.evaluate(async (id) => {
    const [script] = await chrome.scripting.getRegisteredContentScripts({
      ids: [id],
    })
    return script
  }, dynamicNetworkScriptId)

  if (!script) {
    throw new Error(`Dynamic content script was not registered: ${dynamicNetworkScriptId}`)
  }

  expect(script).toMatchObject({
    id: dynamicNetworkScriptId,
    matches: ['https://example.com/*'],
    runAt: 'document_start',
    world: 'MAIN',
  })

  const [scriptPath] = script.js ?? []
  if (!scriptPath) {
    throw new Error(`Dynamic content script has no JS file: ${dynamicNetworkScriptId}`)
  }

  expect(scriptPath).toContain('interceptor.iife')
  expect(scriptPath).not.toContain('loader')

  return scriptPath
}

export async function expectNetworkProbe(page: Page) {
  const probe = await page.evaluate(() => (window as any).__networkProbe)
  expect(probe).toEqual({
    patchBeforePageScript: 'crx-dynamic-main-world-iife',
    fetchBeforeCall: null,
    xhrBeforeCall: null,
    fetchAfterCall: 'crx-dynamic-main-world-iife',
    xhrAfterCall: 'crx-dynamic-main-world-iife',
  })
}
