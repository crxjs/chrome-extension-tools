import { serve } from 'tests/runners'
import { testOutput } from 'tests/testOutput'
import { mockDate } from 'tests/helpers'

mockDate()

let result: Awaited<ReturnType<typeof serve>> | undefined

afterAll(async () => {
  await result?.server.close()
})

test.skip('serve fs output', async () => {
  result = await serve(__dirname)
  await testOutput(result)
})
