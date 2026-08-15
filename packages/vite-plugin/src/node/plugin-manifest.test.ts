import { describe, expect, it } from 'vitest'
import { getDocumentStartLoaderWarnings } from './plugin-manifest'

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
