import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { build } from 'vite'
import { crx } from '@crxjs/vite-plugin'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { existsSync, rmSync } from 'fs'
import { chromium, type BrowserContext } from 'playwright-chromium'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = resolve(__dirname, 'dist-e2e-test')

const manifest = {
  manifest_version: 3,
  name: 'CRXJS E2E Test',
  version: '1.0.0',
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['src/content.js'],
    },
  ],
}

describe('E2E Browser Test', () => {
  let context: BrowserContext

  beforeAll(async () => {
    // Clean up before test
    if (existsSync(outDir)) {
      rmSync(outDir, { recursive: true })
    }

    // Build the extension
    await build({
      root: __dirname,
      logLevel: 'silent',
      build: {
        outDir,
        emptyOutDir: true,
        minify: false,
      },
      plugins: [crx({ manifest })],
    })

    // Launch browser with extension
    context = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${outDir}`,
        `--load-extension=${outDir}`,
        '--no-first-run',
        '--disable-gpu',
      ],
    })
  })

  afterAll(async () => {
    if (context) {
      await context.close()
    }
    if (existsSync(outDir)) {
      rmSync(outDir, { recursive: true })
    }
  })

  it('should load extension in browser', async () => {
    const page = await context.newPage()
    await page.goto('https://example.com')

    // Wait for content script to inject the div
    const testDiv = await page.waitForSelector('#crxjs-test', {
      timeout: 10000,
    })

    expect(testDiv).toBeTruthy()
    const text = await testDiv.textContent()
    expect(text).toBe('CRXJS Extension Active')

    await page.close()
  })
})
