import { build } from 'tests/runners'
import { testOutput } from 'tests/testOutput'
import { test } from 'vitest'

test('build fs output', async () => {
  await testOutput(await build(__dirname))
})
