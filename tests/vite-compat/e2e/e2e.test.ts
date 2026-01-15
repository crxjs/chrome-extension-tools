import { existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'vite'
import { crx } from '@crxjs/vite-plugin'
import { chromium, type BrowserContext } from 'playwright-chromium'
import { describe, test, expect, beforeEach, afterEach } from 'vitest'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const distDir = join(__dirname, 'dist')
const cacheDir = join(__dirname, '.chromium')

const manifest = {
  manifest_version: 3 as const,
  name: 'E2E Test Extension',
  version: '1.0.0',
  content_scripts: [
    {
      js: ['src/content.js'],
      matches: ['https://example.com/*'],
    },
  ],
}

// Simple HTML page for testing
const exampleHtml = `
<!DOCTYPE html>
<html>
<head><title>Example</title></head>
<body>
  <h1>Example Page</h1>
  <div id="test-target">Original content</div>
</body>
</html>
`

describe('E2E Browser Tests', () => {
  let browser: BrowserContext | undefined

  beforeEach(async () => {
    // Clean up directories
    if (existsSync(distDir)) {
      rmSync(distDir, { recursive: true, force: true })
    }
    if (existsSync(cacheDir)) {
      rmSync(cacheDir, { recursive: true, force: true })
    }
  })

  afterEach(async () => {
    if (browser) {
      await browser.close()
      browser = undefined
    }
  })

  test('extension content script runs in browser after build', async () => {
    // Build the extension
    await build({
      root: __dirname,
      logLevel: 'silent',
      build: {
        outDir: 'dist',
        minify: false,
      },
      plugins: [crx({ manifest })],
    })

    // Verify build output
    expect(existsSync(join(distDir, 'manifest.json'))).toBe(true)

    // Launch browser with extension loaded
    browser = await chromium.launchPersistentContext(cacheDir, {
      headless: false,
      args: [
        `--disable-extensions-except=${distDir}`,
        `--load-extension=${distDir}`,
        '--headless=new',
      ],
    })

    // Mock example.com
    await browser.route('https://example.com/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: exampleHtml,
      })
    })

    // Navigate to the page
    const page = await browser.newPage()
    await page.goto('https://example.com')

    // Wait for our content script element to appear
    const crxElement = page.locator('#crxjs-e2e-test')
    await crxElement.waitFor({ timeout: 10000 })

    // Verify the content script ran
    const text = await crxElement.textContent()
    expect(text).toContain('CRXJS E2E Test')

    // Verify element has correct styling (proves CSS was injected)
    const bgColor = await crxElement.evaluate(
      (el) => window.getComputedStyle(el).backgroundColor,
    )
    expect(bgColor).toBe('rgb(76, 175, 80)') // #4CAF50
  }, 60000)

  test('content script DOM manipulation works', async () => {
    // Build the extension
    await build({
      root: __dirname,
      logLevel: 'silent',
      build: {
        outDir: 'dist',
        minify: false,
      },
      plugins: [crx({ manifest })],
    })

    // Launch browser with extension loaded
    browser = await chromium.launchPersistentContext(cacheDir, {
      headless: false,
      args: [
        `--disable-extensions-except=${distDir}`,
        `--load-extension=${distDir}`,
        '--headless=new',
      ],
    })

    await browser.route('https://example.com/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: exampleHtml,
      })
    })

    const page = await browser.newPage()
    await page.goto('https://example.com')

    // Original page content should still be there
    const heading = page.locator('h1')
    await heading.waitFor({ timeout: 5000 })
    expect(await heading.textContent()).toBe('Example Page')

    // Content script element should be added
    const crxElement = page.locator('#crxjs-e2e-test')
    await crxElement.waitFor({ timeout: 10000 })
    expect(await crxElement.isVisible()).toBe(true)
  }, 60000)

  test('multiple page navigations work with content script', async () => {
    // Build the extension
    await build({
      root: __dirname,
      logLevel: 'silent',
      build: {
        outDir: 'dist',
        minify: false,
      },
      plugins: [crx({ manifest })],
    })

    browser = await chromium.launchPersistentContext(cacheDir, {
      headless: false,
      args: [
        `--disable-extensions-except=${distDir}`,
        `--load-extension=${distDir}`,
        '--headless=new',
      ],
    })

    await browser.route('https://example.com/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: exampleHtml,
      })
    })

    const page = await browser.newPage()

    // First navigation
    await page.goto('https://example.com/page1')
    let crxElement = page.locator('#crxjs-e2e-test')
    await crxElement.waitFor({ timeout: 10000 })
    expect(await crxElement.isVisible()).toBe(true)

    // Second navigation - content script should run again
    await page.goto('https://example.com/page2')
    crxElement = page.locator('#crxjs-e2e-test')
    await crxElement.waitFor({ timeout: 10000 })
    expect(await crxElement.isVisible()).toBe(true)
  }, 60000)
})
