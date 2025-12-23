#!/usr/bin/env node

/**
 * Test script to verify that the Vite manifest is properly removed from output
 * when build.manifest is false or undefined, and kept when build.manifest is true.
 */

import { existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const distDir = join(__dirname, 'dist')
const viteManifestPath = join(distDir, '.vite', 'manifest.json')

function cleanup() {
  if (existsSync(distDir)) {
    rmSync(distDir, { recursive: true, force: true })
  }
}

function runBuild(configFile = undefined) {
  const configArg = configFile ? `--config ${configFile}` : ''
  execSync(`npx vite build ${configArg}`, {
    cwd: __dirname,
    stdio: 'inherit',
  })
}

function test() {
  let passed = 0
  let failed = 0

  // Test 1: Default config (manifest: false) - Vite manifest should NOT exist
  console.log('\n--- Test 1: build.manifest = false ---')
  cleanup()
  runBuild()

  if (existsSync(viteManifestPath)) {
    console.error('FAIL: .vite/manifest.json exists but should have been removed')
    failed++
  } else {
    console.log('PASS: .vite/manifest.json was correctly removed')
    passed++
  }

  // Test 2: Config with manifest: true - Vite manifest SHOULD exist
  console.log('\n--- Test 2: build.manifest = true ---')
  cleanup()
  runBuild('vite.config.with-manifest.ts')

  if (existsSync(viteManifestPath)) {
    console.log('PASS: .vite/manifest.json exists as expected')
    passed++
  } else {
    console.error('FAIL: .vite/manifest.json should exist but was removed')
    failed++
  }

  // Cleanup
  cleanup()

  // Summary
  console.log(`\n--- Results ---`)
  console.log(`Passed: ${passed}`)
  console.log(`Failed: ${failed}`)

  process.exit(failed > 0 ? 1 : 0)
}

test()
