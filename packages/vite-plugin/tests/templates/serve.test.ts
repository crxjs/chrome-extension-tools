import { serve, testOutput } from 'tests/runners'
import { mockDate } from 'tests/helpers'

mockDate()

let result: Awaited<ReturnType<typeof serve>> | undefined

afterAll(async () => {
  await result?.devServer.close()
})

test('serve fs output', async () => {
  result = await serve(__dirname)
  await testOutput(result)
})
