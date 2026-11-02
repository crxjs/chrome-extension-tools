import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { ensureFirefoxPatched } from '@openpolyfill/firefox-addon-playwright-harness'

// CI installs with --ignore-scripts. Apply the pinned harness's required
// Playwright patch explicitly, only when running the Firefox suite.
const entry = fileURLToPath(
  import.meta.resolve('@openpolyfill/firefox-addon-playwright-harness'),
)
execFileSync(
  process.execPath,
  [resolve(dirname(entry), '../scripts/patch-closed-shadow-selectors.mjs')],
  { stdio: 'inherit' },
)
await ensureFirefoxPatched()
