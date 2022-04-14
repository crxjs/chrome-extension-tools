import { build } from 'tests/runners'
import { testOutput } from 'tests/testOutput'
import { mockDate } from 'tests/helpers'

mockDate()

test("works with 'self' directive", async () => {
  const result = await build(__dirname)
  await testOutput(result)
})
