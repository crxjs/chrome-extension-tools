import fs from 'fs-extra'
import { join } from 'pathe'
import { allFileWriterErrors } from 'src/fileWriter-rxjs'
import { glob } from 'tinyglobby'
import { expect, test } from 'vitest'
import { serve } from '../../runners'

test('shortens Vue virtual modules served from outside the Vite root', async () => {
  const result = await serve(__dirname)
  const outsideRootModules = await glob('vendor/fs-*', {
    cwd: result.outDir,
  })

  expect(outsideRootModules.length).toBeGreaterThanOrEqual(2)
  expect(outsideRootModules).toEqual(
    expect.arrayContaining([
      expect.stringMatching(/^vendor\/fs-[A-Za-z0-9]{12}\.js$/),
    ]),
  )
  expect(outsideRootModules.every((fileName) => fileName.length === 25)).toBe(
    true,
  )

  const contentScript = await fs.readFile(
    join(result.outDir, 'src/content.ts.js'),
    'utf8',
  )
  expect(contentScript).toMatch(/\/vendor\/fs-[A-Za-z0-9]{12}\.js/)
  expect(contentScript).not.toContain('vite-vue-outside-root-shared')

  await result.server.close()
  expect(await allFileWriterErrors).toEqual([])
})
