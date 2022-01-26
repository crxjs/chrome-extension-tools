import {
  getRollupOutput,
  testBuildOutput,
} from '$test/helpers/testBuild'
import { jestSetTimeout } from '$test/helpers/timeout'

jestSetTimeout(30000)

test('manifest vs output', async () => {
  const output = await getRollupOutput(__dirname)
  await testBuildOutput(output)
})
