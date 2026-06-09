import fs from 'fs-extra'
import path from 'pathe'
import { fileURLToPath } from 'url'
import { describe, expect, test } from 'vitest'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const packageRoot = path.resolve(__dirname, '../..')

describe('package exports', () => {
  test('uses ESM declarations for the ESM entrypoint', async () => {
    const packageJson = await fs.readJson(path.join(packageRoot, 'package.json'))

    expect(packageJson.exports['.']).toEqual({
      import: {
        types: './dist/index.d.mts',
        default: './dist/index.mjs',
      },
      require: {
        types: './index.d.cts',
        default: './index.cjs',
      },
    })
    expect(packageJson.types).toBe('dist/index.d.ts')
  })

  test('builds both legacy and ESM declaration files', async () => {
    const rollupConfig = await fs.readFile(
      path.join(packageRoot, 'rollup.config.ts'),
      'utf8',
    )

    expect(rollupConfig).toContain("file: 'dist/index.d.ts'")
    expect(rollupConfig).toContain("file: 'dist/index.d.mts'")
  })
})
