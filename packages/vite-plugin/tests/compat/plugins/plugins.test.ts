import { existsSync, rmSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'vite'
import { crx, type CrxPlugin } from 'src'
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

describe('Plugins initialization', () => {
  beforeEach(() => {
    if (existsSync(distDir)) {
      rmSync(distDir, { recursive: true, force: true })
    }
  })

  test('build succeeds without "plugins is not iterable" error', async () => {
    // This test verifies that the configResolved hook properly initializes
    // the plugins array in Vite 7 (rolldown-vite) where buildStart doesn't
    // receive options.plugins
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
      readFileSync(join(distDir, 'manifest.json'), 'utf-8'),
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
          transformCrxManifest(manifest: unknown) {
            transformCalled = true
            return manifest
          },
        } as CrxPlugin,
      ],
    })

    // The transformCrxManifest hook should have been called
    // This proves that plugins array was properly initialized and iterated
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
          renderCrxManifest(manifest: unknown) {
            renderCalled = true
            return manifest
          },
        } as CrxPlugin,
      ],
    })

    // The renderCrxManifest hook should have been called
    // This proves that plugins array was properly initialized and iterated
    expect(renderCalled).toBe(true)
  })
})
