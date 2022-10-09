import { serve, testOutput } from 'tests/runners'
import { afterAll, test } from 'vitest'

let result: Awaited<ReturnType<typeof serve>> | undefined

afterAll(async () => {
  await result?.devServer.close()
})

test('serve fs output', async () => {
  result = await serve(__dirname)
  await testOutput(result)
})
