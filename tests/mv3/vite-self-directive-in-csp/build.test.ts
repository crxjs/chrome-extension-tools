import { build } from 'tests/runners'
import { testOutput } from 'tests/testOutput'
import { mockDate } from 'tests/helpers'

mockDate()

describe('Test manifest v3', () => {
  it("should work if the 'self' directive is not found", async () => {
    const result = await build(__dirname)
    await testOutput(result)
  })

  it("should fail if the 'self' directive is found", async () => {
    const runBuild = async () => await build(__dirname, 'vite.csp.ts')
    await expect(runBuild).rejects.toThrowError('unable to parse manifest code')
  })
})
