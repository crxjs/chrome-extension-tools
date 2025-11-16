import { build } from 'tests/runners'
import { testOutput } from 'tests/testOutput'
import { test, expect } from 'vitest'
import fg from 'fast-glob'

test('build fs output - manifest enabled', async () => {
  const result = await build(__dirname)
  
  // Get all files from output directory
  const files = await fg(`**/*`, { cwd: result.outDir, dot: true })
  
  // When build.manifest is true, the Vite manifest should be kept.
  // Vite 7 writes the manifest to '.vite/manifest.json', so ensure we preserve it
  // alongside the Chrome extension manifest.
  
  // The Chrome extension manifest.json should be present
  expect(files).toContain('manifest.json')

  // The Vite manifest should remain alongside the extension manifest
  expect(files).toContain('.vite/manifest.json')
  
  // Verify we have the expected files
  expect(files.length).toBeGreaterThan(0)
  
  await testOutput(result)
})
