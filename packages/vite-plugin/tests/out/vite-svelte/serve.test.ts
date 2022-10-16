import { serve } from '../../runners'
import { testOutput } from '../../testOutput'
import { test } from 'vitest'

test('serve fs output', async () => {
  const result = await serve(__dirname)
  await testOutput(result)
})
