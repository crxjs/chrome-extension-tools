import { serve } from 'tests/runners'
import { testOutput } from 'tests/testOutput'
import { afterAll, test } from 'vitest'

let result: Awaited<ReturnType<typeof serve>> | undefined

afterAll(async () => {
  try {
    await result?.server.close()
  } catch (error) {}
})

test('serve fs output', async () => {
  result = await serve(__dirname)
  await testOutput(result)
})
