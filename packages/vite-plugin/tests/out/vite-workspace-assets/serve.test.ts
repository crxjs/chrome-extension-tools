import fs from 'fs-extra'
import { join } from 'pathe'
import { glob } from 'tinyglobby'
import { serve } from 'tests/runners'
import { expect, test } from 'vitest'

test('serves assets imported by a workspace package outside the Vite root', async () => {
  const result = await serve(__dirname)

  try {
    const files = await glob('**/*', { cwd: result.outDir })
    const assetFile = files.find((file) => file.endsWith('badge.svg'))

    expect(assetFile).toBeDefined()
    await expect(
      fs.readFile(join(result.outDir, assetFile!), 'utf8'),
    ).resolves.toContain('workspace asset')
  } finally {
    await result.server.close()
  }
})
