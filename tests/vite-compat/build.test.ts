import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { build } from 'vite'
import { crx } from '@crxjs/vite-plugin'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { existsSync, rmSync, readFileSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = resolve(__dirname, 'dist-build-test')

const manifest = {
  manifest_version: 3,
  name: 'CRXJS Build Test',
  version: '1.0.0',
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['src/content.js'],
    },
  ],
}

describe('Build Test', () => {
  beforeAll(async () => {
    // Clean up before test
    if (existsSync(outDir)) {
      rmSync(outDir, { recursive: true })
    }
  })

  afterAll(() => {
    // Clean up after test
    if (existsSync(outDir)) {
      rmSync(outDir, { recursive: true })
    }
  })

  it('should build and produce a valid manifest.json', async () => {
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

    // Check manifest.json exists
    const manifestPath = resolve(outDir, 'manifest.json')
    expect(existsSync(manifestPath)).toBe(true)

    // Parse and validate manifest
    const outputManifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
    expect(outputManifest.manifest_version).toBe(3)
    expect(outputManifest.name).toBe('CRXJS Build Test')
    expect(outputManifest.version).toBe('1.0.0')
    expect(outputManifest.content_scripts).toBeDefined()
    expect(outputManifest.content_scripts.length).toBeGreaterThan(0)
  })
})
