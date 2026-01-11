import { existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build, version as viteVersion } from 'vite'
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

// Vite 5+ uses .vite/manifest.json, Vite 3-4 uses manifest.json at root
const viteMajor = parseInt(viteVersion.split('.')[0], 10)
const isVite5Plus = viteMajor >= 5
const viteManifestPath = isVite5Plus
  ? join(distDir, '.vite', 'manifest.json')
  : join(distDir, 'manifest.json')

describe(
  'Vite build.manifest setting (Vite 5+)',
  { skip: !isVite5Plus },
  () => {
    beforeEach(() => {
      if (existsSync(distDir)) {
        rmSync(distDir, { recursive: true, force: true })
      }
    })

    test('build.manifest=false removes .vite/manifest.json from output', async () => {
      await build({
        root: __dirname,
        logLevel: 'silent',
        build: {
          outDir: 'dist',
          manifest: false,
          minify: false,
        },
        plugins: [crx({ manifest })],
      })

      // Chrome extension manifest should exist
      expect(existsSync(join(distDir, 'manifest.json'))).toBe(true)

      // Vite manifest should NOT exist
      expect(existsSync(viteManifestPath)).toBe(false)
    })

    test('build.manifest=true preserves .vite/manifest.json in output', async () => {
      await build({
        root: __dirname,
        logLevel: 'silent',
        build: {
          outDir: 'dist',
          manifest: true,
          minify: false,
        },
        plugins: [crx({ manifest })],
      })

      // Chrome extension manifest should exist
      expect(existsSync(join(distDir, 'manifest.json'))).toBe(true)

      // Vite manifest SHOULD exist
      expect(existsSync(viteManifestPath)).toBe(true)
    })

    test('build.manifest undefined (default) removes .vite/manifest.json from output', async () => {
      await build({
        root: __dirname,
        logLevel: 'silent',
        build: {
          outDir: 'dist',
          // manifest not set - should default to removing it
          minify: false,
        },
        plugins: [crx({ manifest })],
      })

      // Chrome extension manifest should exist
      expect(existsSync(join(distDir, 'manifest.json'))).toBe(true)

      // Vite manifest should NOT exist
      expect(existsSync(viteManifestPath)).toBe(false)
    })
  },
)

describe(
  'Vite build.manifest setting (Vite 3-4)',
  { skip: isVite5Plus },
  () => {
    beforeEach(() => {
      if (existsSync(distDir)) {
        rmSync(distDir, { recursive: true, force: true })
      }
    })

    test('build succeeds and produces Chrome extension manifest', async () => {
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
    })
  },
)
