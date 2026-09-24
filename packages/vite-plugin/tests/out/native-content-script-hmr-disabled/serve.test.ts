import fs from 'fs-extra'
import path from 'pathe'
import { serve } from 'tests/runners'
import { expect, test } from 'vitest'

test('liveReload false disables native content script hmr client', async () => {
  const result = await serve(__dirname)
  const files = await fs.readdir(path.join(result.outDir, 'src'))
  const manifest = await fs.readJson(path.join(result.outDir, 'manifest.json'))
  const loader = await fs.readFile(
    path.join(result.outDir, 'src/content.js-loader.js'),
    'utf8',
  )

  expect(result.config.server.hmr).toBe(false)
  expect(manifest.host_permissions).toContain('http://localhost/*')
  expect(manifest.content_scripts[0].js).toEqual(['src/content.js-loader.js'])
  expect(files).toContain('content.js-loader.js')
  expect(files).not.toContain('content.js.js')
  expect(loader).toMatch(/http:\/\/localhost:\d+/)
  expect(loader).toContain('if (false)')
  expect(loader).toContain('/@vite/client')
  expect(loader).toContain('/src/content.js')
})
