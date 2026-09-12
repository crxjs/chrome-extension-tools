import fs from 'fs-extra'
import { createRequire } from 'module'
import path from 'pathe'
import { allFilesSuccess } from 'src/fileWriter-rxjs'
import { serve } from 'tests/runners'
import { expect, test } from 'vitest'

const require = createRequire(import.meta.url)
const viteVersion = (require('vite/package.json') as { version: string }).version
const testIfVite8 = viteVersion.startsWith('8.') ? test : test.skip

testIfVite8('serve emits React Refresh self import for Vite 8', async () => {
  const result = await serve(__dirname)

  try {
    await allFilesSuccess()

    const appModule = await fs.readFile(
      path.join(result.outDir, 'src/App.tsx.js'),
      'utf-8',
    )

    expect(appModule).toContain(
      'import * as __vite_react_currentExports from "/src/App.tsx.js"',
    )
  } finally {
    result.server.close()
  }
})
