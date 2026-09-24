import fs from 'fs-extra'
import { join } from 'pathe'
import { glob } from 'tinyglobby'
import { serve } from 'tests/runners'
import { expect, test } from 'vitest'

test('serves assets imported by a workspace package outside the Vite root', async () => {
  const result = await serve(__dirname)

  try {
    const files = await glob('**/*', { cwd: result.outDir })
    const assetContents = await Promise.all(
      files
        .filter((file) => file.endsWith('.svg'))
        .map((file) => fs.readFile(join(result.outDir, file), 'utf8')),
    )

    expect(
      assetContents.some((content) => content.includes('workspace asset')),
    ).toBe(true)
  } finally {
    await result.server.close()
  }
})
