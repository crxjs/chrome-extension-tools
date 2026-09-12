import { existsSync, rmSync } from 'node:fs'
import { join } from 'pathe'
import { build, version as viteVersion } from 'vite'
import { beforeEach, describe, expect, test } from 'vitest'
import { crx } from 'src/.'
import manifest from './manifest.json'

const distDir = join(__dirname, 'dist')
const viteMajor = parseInt(viteVersion.split('.')[0], 10)
const isVite5Plus = viteMajor >= 5
const viteManifestPath = join(distDir, '.vite', 'manifest.json')

async function buildExtension(viteManifest?: boolean) {
  await build({
    root: __dirname,
    configFile: false,
    envFile: false,
    logLevel: 'error',
    build: {
      outDir: distDir,
      minify: false,
      ...(typeof viteManifest === 'boolean' ? { manifest: viteManifest } : {}),
    },
    plugins: [crx({ manifest })],
  })
}

beforeEach(() => {
  rmSync(distDir, { recursive: true, force: true })
})

describe('Vite build.manifest setting', () => {
  const testVite5Plus = isVite5Plus ? test : test.skip
  const testPreVite5 = isVite5Plus ? test.skip : test

  testVite5Plus(
    'removes the Vite manifest when build.manifest is false',
    async () => {
      await buildExtension(false)

      expect(existsSync(join(distDir, 'manifest.json'))).toBe(true)
      expect(existsSync(viteManifestPath)).toBe(false)
    },
  )

  testVite5Plus(
    'preserves the Vite manifest when build.manifest is true',
    async () => {
      await buildExtension(true)

      expect(existsSync(join(distDir, 'manifest.json'))).toBe(true)
      expect(existsSync(viteManifestPath)).toBe(true)
    },
  )

  testVite5Plus(
    'removes the Vite manifest when build.manifest is unset',
    async () => {
      await buildExtension()

      expect(existsSync(join(distDir, 'manifest.json'))).toBe(true)
      expect(existsSync(viteManifestPath)).toBe(false)
    },
  )

  testPreVite5(
    'builds the Chrome extension manifest on Vite 3 and 4',
    async () => {
      await buildExtension()

      expect(existsSync(join(distDir, 'manifest.json'))).toBe(true)
    },
  )
})
