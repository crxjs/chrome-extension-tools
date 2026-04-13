import { basename } from 'path'
import { glob } from 'tinyglobby'
import { test, expect } from 'vitest'
import { getCustomId } from '../helpers'
import { serve } from '../runners'

test(
  'crx runs from server output',
  async (ctx) => {
    const { browser } = await serve(__dirname)
    const page = await browser.newPage()
    await page.goto('https://example.com')

    const app = page.locator('#app')
    await app.waitFor()

    expect(await app.screenshot()).toMatchImageSnapshot({
      customSnapshotIdentifier: getCustomId(ctx),
    })
  },
  { retry: process.env.CI ? 5 : 0 },
)

test('no output files contain Windows-illegal characters', async () => {
  const { outDir } = await serve(__dirname)
  const files = await glob('**/*', { cwd: outDir })

  // Colons, angle brackets, double quotes, pipes, question marks, and
  // asterisks are all forbidden in Windows filenames.
  const windowsIllegal = /[<>:"|?*]/
  const invalidFiles = files.filter((file) =>
    file.split('/').some((segment) => windowsIllegal.test(segment)),
  )

  expect(invalidFiles).toEqual([])
})
