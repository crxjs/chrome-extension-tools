import { build } from '../../runners'
import { testOutput } from '../../testOutput'
import { test } from 'vitest'

test('build fs output', async () => {
  const result = await build(__dirname)
  await testOutput(result)
})
