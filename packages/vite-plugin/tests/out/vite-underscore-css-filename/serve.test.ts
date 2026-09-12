import { serve } from 'tests/runners'
import { testOutput } from 'tests/testOutput'
import { test, expect } from 'vitest'
import { glob } from 'tinyglobby'
import { basename } from 'path'

test('no output files start with underscore (except _locales)', async () => {
  const result = await serve(__dirname)
  const { outDir } = result

  const files = await glob(`**/*`, { cwd: outDir })

  // Filter out _locales which is allowed to start with underscore
  const invalidFiles = files.filter((file) => {
    const name = basename(file)
    // _locales is a special Chrome extension folder that is allowed
    if (file.startsWith('_locales/')) return false
    return name.startsWith('_')
  })

  await testOutput(result)

  expect(invalidFiles).toEqual([])
})
