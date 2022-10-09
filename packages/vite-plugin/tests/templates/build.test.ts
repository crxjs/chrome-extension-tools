import { build, testOutput } from 'tests/runners'

test('build fs output', async () => {
  const result = await build(__dirname)
  await testOutput(result)
})
