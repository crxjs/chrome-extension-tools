import { describe, expect, it } from 'vitest'
import { getChangedFilePath } from './plugin-hmr'

describe('getChangedFilePath', () => {
  it('normalizes Windows file paths to content script ids', () => {
    const root = String.raw`D:\a\chrome-extension-tools\chrome-extension-tools\packages\vite-plugin\tests\e2e\mv3-dynamic-script-iife`
    const file = String.raw`D:\a\chrome-extension-tools\chrome-extension-tools\packages\vite-plugin\tests\e2e\mv3-dynamic-script-iife\src\main-world.ts`

    expect(getChangedFilePath(root, file)).toBe('/src/main-world.ts')
  })

  it('normalizes POSIX file paths to content script ids', () => {
    const root =
      '/home/runner/work/chrome-extension-tools/chrome-extension-tools/packages/vite-plugin/tests/e2e/mv3-dynamic-script-iife'
    const file = `${root}/src/main-world.ts`

    expect(getChangedFilePath(root, file)).toBe('/src/main-world.ts')
  })

  it('returns null for files outside the root', () => {
    expect(getChangedFilePath('/repo/project', '/repo/other/src/main-world.ts')).toBe(
      null,
    )
    expect(
      getChangedFilePath('/repo/project', '/repo/project-other/src/main-world.ts'),
    ).toBe(null)
  })
})
