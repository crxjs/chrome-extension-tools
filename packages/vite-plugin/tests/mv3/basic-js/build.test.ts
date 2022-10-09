import { build } from 'tests/runners'
import { testOutput } from 'tests/testOutput'
import { mockDate } from 'tests/helpers'
import { test } from 'vitest'

mockDate()

test('build fs output', async () => {
  const result = await build(__dirname)
  await testOutput(result)
})
