import { describe, expect, it } from 'vitest'
import {
  getDocumentStartLoaderWarnings,
  pluginManifest,
} from './plugin-manifest'
import { pluginOptionsProvider } from './plugin-optionsProvider'

describe('getDocumentStartLoaderWarnings', () => {
  it('returns document_start content scripts that are not IIFE or standalone', () => {
    expect(
      getDocumentStartLoaderWarnings(
        {
          content_scripts: [
            {
              matches: ['https://example.com/*'],
              js: [
                'src/regular.ts',
                'src/interceptor.iife.tsx',
                'src/standalone.ts',
              ],
              run_at: 'document_start',
            },
            {
              matches: ['https://example.com/*'],
              js: ['src/document-idle.ts'],
              run_at: 'document_idle',
            },
          ],
        },
        ['src/standalone.ts'],
      ),
    ).toEqual(['src/regular.ts'])
  })

  it('supports standalone files with leading slashes', () => {
    expect(
      getDocumentStartLoaderWarnings(
        {
          content_scripts: [
            {
              matches: ['https://example.com/*'],
              js: ['/src/standalone.ts'],
              run_at: 'document_start',
            },
          ],
        },
        ['src/standalone.ts'],
      ),
    ).toEqual([])
  })
})

describe('pluginManifest config hook', () => {
  it('extracts input from build.rolldownOptions when rollupOptions is omitted (Vite 8)', async () => {
    const plugins = [pluginManifest()].flat()
    const manifestInit = plugins.find((p) => p.name === 'crx:manifest-init')
    if (!manifestInit || typeof manifestInit.config !== 'function') {
      throw new Error('Missing crx:manifest-init config hook')
    }

    const result = await Reflect.apply(manifestInit.config, undefined, [
      {
        plugins: [
          pluginOptionsProvider({
            manifest: {
              manifest_version: 3,
              name: 'test',
              version: '1.0.0',
            },
          }),
        ],
        build: {
          rolldownOptions: {
            input: {
              offscreen: 'src/offscreen.html',
              popup: 'popup.html',
            },
          },
        },
      },
      { command: 'serve', mode: 'development' },
    ])

    expect(result?.optimizeDeps?.entries).toContain('src/offscreen.html')
    expect(result?.optimizeDeps?.entries).toContain('popup.html')
  })

  it('extracts input from build.rollupOptions for backwards compatibility', async () => {
    const plugins = [pluginManifest()].flat()
    const manifestInit = plugins.find((p) => p.name === 'crx:manifest-init')
    if (!manifestInit || typeof manifestInit.config !== 'function') {
      throw new Error('Missing crx:manifest-init config hook')
    }

    const result = await Reflect.apply(manifestInit.config, undefined, [
      {
        plugins: [
          pluginOptionsProvider({
            manifest: {
              manifest_version: 3,
              name: 'test',
              version: '1.0.0',
            },
          }),
        ],
        build: {
          rollupOptions: {
            input: ['options.html'],
          },
        },
      },
      { command: 'serve', mode: 'development' },
    ])

    expect(result?.optimizeDeps?.entries).toContain('options.html')
  })
})
