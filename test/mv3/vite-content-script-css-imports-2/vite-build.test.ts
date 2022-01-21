import {
  getViteBuildOutput,
  testBuildOutput,
} from '$test/helpers/testBuild'
import { jestSetTimeout } from '$test/helpers/timeout'

jestSetTimeout(30000)

test('manifest vs output', async () => {
  const output = await getViteBuildOutput(__dirname)
  await testBuildOutput(output)
})
