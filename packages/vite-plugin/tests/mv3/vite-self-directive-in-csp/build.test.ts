import { build } from 'tests/runners'
import { testOutput } from 'tests/testOutput'

test("works with 'self' directive", async () => {
  const result = await build(__dirname)
  await testOutput(result)
})
