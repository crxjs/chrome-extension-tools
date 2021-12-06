import { jestSetTimeout } from '$test/helpers/timeout'
import path from 'path'
import { build } from 'vite'

jestSetTimeout(5000)

const outDir = path.join(__dirname, 'dist-build')

test('validation errors rise', async () => {
  await expect(
    build({
      configFile: path.join(__dirname, 'vite.config.ts'),
      envFile: false,
      build: { outDir },
    }),
  ).rejects.toThrow()
})
