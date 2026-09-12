import { serve } from 'tests/runners'
import { testOutput } from 'tests/testOutput'
import { test } from 'vitest'

// TODO: handle main world scripts through web_accessible_resources

test('serve fs output', async () => {
  let result = await serve(__dirname)
  await testOutput(result)
})
