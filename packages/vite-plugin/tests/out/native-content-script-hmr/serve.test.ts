import fs from 'fs-extra'
import path from 'pathe'
import { serve } from 'tests/runners'
import { expect, test } from 'vitest'

test('serve native content script hmr output', async () => {
  const result = await serve(__dirname)
  const files = await fs.readdir(path.join(result.outDir, 'src'))
  const manifest = await fs.readJson(path.join(result.outDir, 'manifest.json'))
  const loader = await fs.readFile(
    path.join(result.outDir, 'src/content.js-loader.js'),
    'utf8',
  )

  expect(manifest.host_permissions).toContain('http://localhost/*')
  expect(manifest.content_scripts[0].js).toEqual(['src/content.js-loader.js'])
  expect(files).toContain('content.js-loader.js')
  expect(files).not.toContain('content.js.js')
  expect(loader).toContain('http://localhost:5200')
  expect(loader).toContain('/@vite/client')
  expect(loader).toContain('/src/content.js')
})
