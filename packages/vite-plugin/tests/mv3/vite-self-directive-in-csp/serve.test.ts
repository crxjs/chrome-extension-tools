import { serve } from 'tests/runners'
import { testOutput } from 'tests/testOutput'

let result: Awaited<ReturnType<typeof serve>> | undefined

afterAll(async () => {
  await result?.server.close()
})

test("works with 'self' directive", async () => {
  result = await serve(__dirname)
  await testOutput(result)
})
