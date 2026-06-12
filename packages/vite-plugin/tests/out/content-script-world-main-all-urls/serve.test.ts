import { serve } from 'tests/runners'
import { testOutput } from 'tests/testOutput'
import { test } from 'vitest'

test('serve fs output', async () => {
  const result = await serve(__dirname)
  await testOutput(result)
})
