import { existsSync, rmSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build, createServer, ViteDevServer } from 'vite'
import { crx } from '@crxjs/vite-plugin'
import { describe, test, expect, beforeEach, afterEach } from 'vitest'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const distDir = join(__dirname, 'dist')

const manifest = {
  manifest_version: 3 as const,
  name: 'Vite7 E2E Test Extension',
  version: '1.0.0',
  background: {
    service_worker: 'src/background.js',
  },
  content_scripts: [
    {
      js: ['src/content.js'],
      matches: ['https://example.com/*'],
    },
  ],
  permissions: ['storage'],
}

describe('Vite 7 E2E Tests', () => {
  beforeEach(() => {
    if (existsSync(distDir)) {
      rmSync(distDir, { recursive: true, force: true })
    }
  })

  describe('Build mode', () => {
    test('builds extension with content script', async () => {
      await build({
        root: __dirname,
        logLevel: 'silent',
        build: {
          outDir: 'dist',
          minify: false,
        },
        plugins: [crx({ manifest })],
      })

      // Verify manifest.json exists and is valid
      const manifestPath = join(distDir, 'manifest.json')
      expect(existsSync(manifestPath)).toBe(true)

      const builtManifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
      expect(builtManifest.manifest_version).toBe(3)
      expect(builtManifest.name).toBe('Vite7 E2E Test Extension')
      expect(builtManifest.content_scripts).toBeDefined()
      expect(builtManifest.content_scripts.length).toBeGreaterThan(0)
      expect(builtManifest.background).toBeDefined()
    })

    test('builds extension with service worker', async () => {
      await build({
        root: __dirname,
        logLevel: 'silent',
        build: {
          outDir: 'dist',
          minify: false,
        },
        plugins: [crx({ manifest })],
      })

      const builtManifest = JSON.parse(
        readFileSync(join(distDir, 'manifest.json'), 'utf-8')
      )

      // Service worker should be referenced in manifest
      expect(builtManifest.background.service_worker).toBeDefined()

      // Service worker loader file should exist
      const swPath = join(distDir, builtManifest.background.service_worker)
      expect(existsSync(swPath)).toBe(true)

      // The actual background code is in assets folder
      // Check that assets folder has background.js compiled
      const assetsDir = join(distDir, 'assets')
      if (existsSync(assetsDir)) {
        const assets = readdirSync(assetsDir)
        const bgAsset = assets.find((f) => f.startsWith('background'))
        if (bgAsset) {
          const bgContent = readFileSync(join(assetsDir, bgAsset), 'utf-8')
          expect(bgContent).toContain('Background script loaded')
        }
      }
    })

    test('content script file exists and contains code', async () => {
      await build({
        root: __dirname,
        logLevel: 'silent',
        build: {
          outDir: 'dist',
          minify: false,
        },
        plugins: [crx({ manifest })],
      })

      const builtManifest = JSON.parse(
        readFileSync(join(distDir, 'manifest.json'), 'utf-8')
      )

      // Content script should exist
      const contentScriptPath = join(
        distDir,
        builtManifest.content_scripts[0].js[0]
      )
      expect(existsSync(contentScriptPath)).toBe(true)

      // Content script should contain our code
      const contentScript = readFileSync(contentScriptPath, 'utf-8')
      expect(contentScript).toContain('crxjs-vite7-test')
    })

    test('transformCrxManifest hook works in build', async () => {
      let hookCalled = false
      let receivedManifest: any = null

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
            name: 'test-transform',
            transformCrxManifest(m) {
              hookCalled = true
              receivedManifest = m
              // Modify description to prove hook works
              m.description = 'Modified by transform hook'
              return m
            },
          },
        ],
      })

      expect(hookCalled).toBe(true)
      expect(receivedManifest).not.toBeNull()

      // Verify the modification was applied
      const builtManifest = JSON.parse(
        readFileSync(join(distDir, 'manifest.json'), 'utf-8')
      )
      expect(builtManifest.description).toBe('Modified by transform hook')
    })

    test('renderCrxManifest hook works in build', async () => {
      let hookCalled = false

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
            name: 'test-render',
            renderCrxManifest(m) {
              hookCalled = true
              m.author = 'Added by render hook'
              return m
            },
          },
        ],
      })

      expect(hookCalled).toBe(true)

      const builtManifest = JSON.parse(
        readFileSync(join(distDir, 'manifest.json'), 'utf-8')
      )
      expect(builtManifest.author).toBe('Added by render hook')
    })
  })

  describe('Serve mode', () => {
    let server: ViteDevServer | undefined

    afterEach(async () => {
      if (server) {
        await server.close()
        server = undefined
      }
    })

    test('dev server starts without errors', async () => {
      server = await createServer({
        root: __dirname,
        logLevel: 'silent',
        build: {
          outDir: 'dist',
          minify: false,
        },
        plugins: [crx({ manifest })],
      })

      await server.listen()

      expect(server).toBeDefined()
      expect(server.config).toBeDefined()
      expect(server.config.plugins.some((p) => p.name?.startsWith('crx:'))).toBe(true)

      await server.close()
      server = undefined
    })
  })
})
