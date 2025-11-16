import { build } from 'tests/runners'
import { testOutput } from 'tests/testOutput'
import { test, expect } from 'vitest'
import fg from 'fast-glob'
import { version as ViteVersion } from 'vite'

test('build fs output - manifest enabled', async () => {
  const result = await build(__dirname)
  
  // Get all files from output directory
  const files = await fg(`**/*`, { cwd: result.outDir })
  
  // Determine the Vite manifest path based on Vite version
  const viteMajorVersion = parseInt(ViteVersion.split('.')[0])
  const viteManifestPath = viteMajorVersion > 4 ? '.vite/manifest.json' : 'manifest.json'
  
  // When build.manifest is true, the Vite manifest SHOULD be in the output
  // For Vite 5+, it's at .vite/manifest.json
  // For Vite 3-4, it's at manifest.json (same location as Chrome extension manifest)
  if (viteMajorVersion > 4) {
    // In Vite 5+, the Vite manifest is separate from Chrome extension manifest
    expect(files).toContain('.vite/manifest.json')
  }
  // Note: For Vite 3-4, we can't check separately because both manifests are at 'manifest.json'
  // and the Chrome extension manifest overwrites the Vite one in the final output.
  // The important thing is our code doesn't delete it when user wants it.
  
  // The Chrome extension manifest.json should always be present
  expect(files).toContain('manifest.json')
  
  await testOutput(result)
})
