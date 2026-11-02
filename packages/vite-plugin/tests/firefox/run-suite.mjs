import {
  getFirefoxInfo,
  prepareFirefox,
} from 'vitest-environment-web-ext/firefox'

await prepareFirefox()
import { spawnSync } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
mkdirSync('tests/firefox/artifacts', { recursive: true })
for (const file of [
  'full-suite.json',
  'full-suite.md',
  'execution.json',
  'run-status.json',
]) {
  rmSync(`tests/firefox/artifacts/${file}`, { force: true })
}
const firefox = getFirefoxInfo()
const version = spawnSync(firefox.executablePath, ['--version'], {
  encoding: 'utf8',
})
if (version.error || version.status !== 0)
  throw version.error ?? new Error(version.stderr)
const vitestRequire = createRequire(require.resolve('vitest/package.json'))
const environment = {
  node: process.version,
  platform: process.platform,
  arch: process.arch,
  vite: require('vite/package.json').version,
  vitest: require('vitest/package.json').version,
  vitestVite: vitestRequire('vite/package.json').version,
  playwright: firefox.playwright,
  firefox: version.stdout.trim(),
}
writeFileSync(
  'tests/firefox/artifacts/environment.json',
  JSON.stringify(environment, null, 2),
)
console.log(environment)

const child = spawnSync(
  process.execPath,
  [
    require.resolve('vitest/vitest.mjs'),
    'run',
    '--mode',
    'e2e',
    '--reporter=default',
    '--reporter=json',
    '--reporter=./tests/firefox/execution-reporter.mjs',
    '--outputFile=tests/firefox/artifacts/full-suite.json',
    ...process.argv.slice(2),
  ],
  {
    stdio: 'inherit',
    env: { ...process.env, E2E_BROWSER: 'firefox' },
  },
)
writeFileSync(
  'tests/firefox/artifacts/run-status.json',
  JSON.stringify({
    status: child.status,
    signal: child.signal,
    error: child.error?.message,
  }),
)
if (child.error) throw child.error
process.exitCode = child.status ?? 1
