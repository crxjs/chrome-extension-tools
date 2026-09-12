import { build } from 'tests/runners'
import { testOutput } from 'tests/testOutput'
import { test } from 'vitest'

test('build fs output', async () => {
  const result = await build(__dirname)
  await testOutput(result)
})
