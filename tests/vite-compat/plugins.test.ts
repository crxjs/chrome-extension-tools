import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { build, type Plugin } from 'vite'
import { crx } from '@crxjs/vite-plugin'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { existsSync, rmSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = resolve(__dirname, 'dist-plugins-test')

const manifest = {
  manifest_version: 3,
  name: 'CRXJS Plugins Test',
  version: '1.0.0',
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['src/content.js'],
    },
  ],
}

describe('Plugins Test', () => {
  beforeAll(async () => {
    if (existsSync(outDir)) {
      rmSync(outDir, { recursive: true })
    }
  })

  afterAll(() => {
    if (existsSync(outDir)) {
      rmSync(outDir, { recursive: true })
    }
  })

  it('should call plugin hooks in correct order', async () => {
    const hooksCalled: string[] = []

    const testPlugin: Plugin = {
      name: 'test-plugin',
      configResolved() {
        hooksCalled.push('configResolved')
      },
      buildStart() {
        hooksCalled.push('buildStart')
      },
      buildEnd() {
        hooksCalled.push('buildEnd')
      },
    }

    await build({
      root: __dirname,
      logLevel: 'silent',
      build: {
        outDir,
        emptyOutDir: true,
        minify: false,
      },
      plugins: [crx({ manifest }), testPlugin],
    })

    // Verify hooks were called
    expect(hooksCalled).toContain('configResolved')
    expect(hooksCalled).toContain('buildStart')
    expect(hooksCalled).toContain('buildEnd')

    // Verify order: configResolved should be before buildStart
    const configResolvedIndex = hooksCalled.indexOf('configResolved')
    const buildStartIndex = hooksCalled.indexOf('buildStart')
    expect(configResolvedIndex).toBeLessThan(buildStartIndex)
  })

  it('should work with multiple plugins', async () => {
    const pluginACalled: string[] = []
    const pluginBCalled: string[] = []

    const pluginA: Plugin = {
      name: 'plugin-a',
      buildStart() {
        pluginACalled.push('buildStart')
      },
    }

    const pluginB: Plugin = {
      name: 'plugin-b',
      buildStart() {
        pluginBCalled.push('buildStart')
      },
    }

    await build({
      root: __dirname,
      logLevel: 'silent',
      build: {
        outDir,
        emptyOutDir: true,
        minify: false,
      },
      plugins: [pluginA, crx({ manifest }), pluginB],
    })

    expect(pluginACalled).toContain('buildStart')
    expect(pluginBCalled).toContain('buildStart')
  })
})
