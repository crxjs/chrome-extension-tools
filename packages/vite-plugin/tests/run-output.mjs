import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
for (const browser of ['chrome', 'firefox']) {
  console.log(`\nOutput snapshots: ${browser}`)
  const child = spawnSync(
    process.execPath,
    [
      require.resolve('vitest/vitest.mjs'),
      'run',
      '--mode',
      'out',
      ...process.argv.slice(2),
    ],
    {
      stdio: 'inherit',
      env: { ...process.env, OUTPUT_BROWSER: browser },
    },
  )
  if (child.error) throw child.error
  if (child.status !== 0) process.exitCode = child.status ?? 1
}
