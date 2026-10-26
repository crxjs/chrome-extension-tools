import { build } from 'tests/runners'
import { testOutput } from 'tests/testOutput'
import { test } from 'vitest'

test('Firefox production output: MAIN module bridge and sandbox resources', async () => {
  await testOutput(await build(__dirname))
})
