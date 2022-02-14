import { build, testOutput } from 'tests/runners'
import { mockDate } from 'tests/helpers'

mockDate()

test('build fs output', async () => {
  const result = await build(__dirname)
  await testOutput(result)
})
