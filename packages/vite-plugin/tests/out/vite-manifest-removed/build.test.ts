import { build } from 'tests/runners'
import { testOutput } from 'tests/testOutput'
import { test, expect } from 'vitest'
import fg from 'fast-glob'

test('build fs output', async () => {
  const result = await build(__dirname)
  
  // Get all files from output directory
  const files = await fg(`**/*`, { cwd: result.outDir })
  
  // Verify that .vite/manifest.json is NOT in the output
  // This tests the fix for respecting build.manifest: false
  expect(files).not.toContain('.vite/manifest.json')
  
  // Find any .vite directory - there should be none when build.manifest is false/undefined
  const viteFiles = files.filter(f => f.startsWith('.vite/'))
  expect(viteFiles).toEqual([])
  
  // The Chrome extension manifest.json should still be present
  expect(files).toContain('manifest.json')
  
  await testOutput(result)
})
