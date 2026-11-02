import { serve } from 'tests/runners'
import { testOutput } from 'tests/testOutput'
import { test } from 'vitest'

test('serve fs output', async () => {
  await testOutput(await serve(__dirname))
})
