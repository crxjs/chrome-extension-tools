import { existsSync, rmSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'vite'
import { crx } from '@crxjs/vite-plugin'
import { describe, test, expect, beforeEach } from 'vitest'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const distDir = join(__dirname, 'dist')

const manifest = {
  manifest_version: 3 as const,
  name: 'Test Extension',
  version: '1.0.0',
  content_scripts: [
    {
      js: ['src/content.js'],
      matches: ['https://example.com/*'],
    },
  ],
}

describe('Vite 3 plugins initialization (backward compatibility)', () => {
  beforeEach(() => {
    if (existsSync(distDir)) {
      rmSync(distDir, { recursive: true, force: true })
    }
  })

  test('build succeeds with Vite 3 (uses buildStart for plugins)', async () => {
    // This test verifies backward compatibility with Vite 3
    // where buildStart provides options.plugins
    await build({
      root: __dirname,
      logLevel: 'silent',
      build: {
        outDir: 'dist',
        minify: false,
      },
      plugins: [crx({ manifest })],
    })

    // Chrome extension manifest should exist
    expect(existsSync(join(distDir, 'manifest.json'))).toBe(true)

    // Content script should be built
    const manifestJson = JSON.parse(
      readFileSync(join(distDir, 'manifest.json'), 'utf-8')
    )
    expect(manifestJson.content_scripts).toBeDefined()
    expect(manifestJson.content_scripts[0].js).toBeDefined()
    expect(manifestJson.content_scripts[0].js.length).toBeGreaterThan(0)
  })

  test('transformCrxManifest hook is called during build', async () => {
    let transformCalled = false

    await build({
      root: __dirname,
      logLevel: 'silent',
      build: {
        outDir: 'dist',
        minify: false,
      },
      plugins: [
        crx({ manifest }),
        {
          name: 'test-transform-hook',
          transformCrxManifest(manifest) {
            transformCalled = true
            return manifest
          },
        },
      ],
    })

    // The transformCrxManifest hook should have been called
    expect(transformCalled).toBe(true)
  })

  test('renderCrxManifest hook is called during build', async () => {
    let renderCalled = false

    await build({
      root: __dirname,
      logLevel: 'silent',
      build: {
        outDir: 'dist',
        minify: false,
      },
      plugins: [
        crx({ manifest }),
        {
          name: 'test-render-hook',
          renderCrxManifest(manifest) {
            renderCalled = true
            return manifest
          },
        },
      ],
    })

    // The renderCrxManifest hook should have been called
    expect(renderCalled).toBe(true)
  })
})
