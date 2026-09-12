import fs from 'fs-extra'
import path from 'pathe'
import { fileURLToPath } from 'url'
import { describe, expect, test } from 'vitest'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const packageRoot = path.resolve(__dirname, '../..')

describe('package exports', () => {
  test('uses ESM-only exports for the entrypoint', async () => {
    const packageJson = await fs.readJson(path.join(packageRoot, 'package.json'))

    expect(packageJson.exports['.']).toEqual({
      types: './dist/index.d.mts',
      default: './dist/index.mjs',
    })
    expect(packageJson.main).toBe('./dist/index.mjs')
    expect(packageJson.types).toBe('./dist/index.d.mts')
  })

  test('builds ESM declaration files', async () => {
    const tsdownConfig = await fs.readFile(
      path.join(packageRoot, 'tsdown.config.ts'),
      'utf8',
    )

    expect(tsdownConfig).toContain("dts: '.d.mts'")
  })
})
