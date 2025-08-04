import { serve, testOutput } from 'tests/runners'
import { test } from 'vitest'

test('serve fs output', async () => {
  let result = await serve(__dirname)
  await testOutput(result)
})
