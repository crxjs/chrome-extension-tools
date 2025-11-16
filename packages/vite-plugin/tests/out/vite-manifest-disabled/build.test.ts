import { build } from 'tests/runners'
import { testOutput } from 'tests/testOutput'
import { test, expect } from 'vitest'
import fg from 'fast-glob'

test('build fs output - manifest disabled', async () => {
  const result = await build(__dirname)
  
  // Get all files from output directory
  const files = await fg(`**/*`, { cwd: result.outDir })
  
  // When build.manifest is false, Vite manifest should NOT be in the output
  expect(files).not.toContain('.vite/manifest.json')
  
  // Find any .vite directory - there should be none when build.manifest is false
  const viteFiles = files.filter(f => f.startsWith('.vite/'))
  expect(viteFiles).toEqual([])
  
  // The Chrome extension manifest.json should still be present
  expect(files).toContain('manifest.json')
  
  await testOutput(result)
})
