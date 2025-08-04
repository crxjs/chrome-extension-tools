import { serve } from 'tests/runners'
import { testOutput } from 'tests/testOutput'
import { test } from 'vitest'

test("works with 'self' directive", async () => {
  let result = await serve(__dirname)
  await testOutput(result)
})
