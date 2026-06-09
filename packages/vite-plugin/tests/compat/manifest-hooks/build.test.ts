import { existsSync, rmSync } from 'node:fs'
import { join } from 'pathe'
import { build } from 'vite'
import { beforeEach, expect, test } from 'vitest'
import { crx, type CrxPlugin } from 'src/.'
import manifest from './manifest.json'

const distDir = join(__dirname, 'dist')

beforeEach(() => {
  rmSync(distDir, { recursive: true, force: true })
})

test('runs manifest transform and render hooks during build', async () => {
  let transformCalled = false
  let renderCalled = false

  await build({
    root: __dirname,
    configFile: false,
    envFile: false,
    logLevel: 'error',
    build: {
      outDir: distDir,
      minify: false,
    },
    plugins: [
      crx({ manifest }),
      {
        name: 'test-manifest-hooks',
        transformCrxManifest(manifest) {
          transformCalled = true
          return manifest
        },
        renderCrxManifest(manifest) {
          renderCalled = true
          return manifest
        },
      } as CrxPlugin,
    ],
  })

  expect(existsSync(join(distDir, 'manifest.json'))).toBe(true)
  expect(transformCalled).toBe(true)
  expect(renderCalled).toBe(true)
})
