# Shared browser environment migration

This migration starts at `7d35cc1f37e3fb2b64e9a498b454bc647a27f2fd` (#1252).
It depends on [vitest-environment-web-ext #4](https://github.com/crxjs/vitest-environment-web-ext/pull/4),
currently pinned to commit `2171a2157070c9fee76634a260275bd2cb7d8c2e`.
Neither PR is merged and the library is not published by this migration.

## Ownership

`vitest-environment-web-ext` owns Chromium and Firefox launch/close, temporary
Firefox extension installation (including extensions without a background),
profiles and debugger ports, OpenPolyfill preparation, extension URLs, background
evaluation and replacement actors after runtime reload. CRXJS no longer has a
Firefox launcher, preparation script, worker-shaped RDP proxy or Chromium profile
launcher/template implementation.

The custom environment uses `autoLaunch: false`: each CRXJS test builds or serves
its fixture before calling the environment's public `browser.launch(outDir)`.
The existing helper delegates background access to `browser.getBackground()`;
Firefox URL matching obtains the scheme from `browser.getExtensionURL()`.

Vite build/dev-server management, fixture manifests, HMR assertions, every retry
and skip, output snapshots, Firefox product compatibility fixes from #1252, and
the independent Node/Selenium stock-Firefox smoke remain in CRXJS.

## Toolchain separation and installation

Vitest 3.2.7 resolves its own compatible Vite (6.4.1 in this lockfile). The plugin
and fixture runners continue importing the separately installed `vite`, starting
at Vite 3.2.11. The supported matrix remains Vite 3, 6, 7 and 8.1. There is no global
Vite override and no product dependency upgrade. Sequential E2E execution uses
forks with `fileParallelism: false`; the retired `--threads false` flag is removed.
The old `meta.file` test context and snapshot string escaping are adapted to the
new runner without changing assertions or stored snapshots.

Before publication the immutable Git dependency must build its own distribution.
Use `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 pnpm install --frozen-lockfile`;
`onlyBuiltDependencies` explicitly permits that package's build. The library's
prepare script builds its distribution. During dependency installation only,
CI sets `CI=false` while retaining the outer `--frozen-lockfile`. This prevents
pnpm's nested Git preparation from rejecting the library's own lockfile after
inheriting CRXJS's `injectWorkspacePackages` setting. Tests retain the normal
`CI=true` environment and all existing retry/skip conditions. A clean-store
reproduction failed with `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH` before this change
and successfully built/imported the package afterward. This workaround can be
removed with the Git pin after publication. The library's plain-JavaScript
build configuration is named `tsdown.config.mjs`, avoiding Node 22's native TypeScript-config restriction inside dependency
folders. CI explicitly configures the already cached `$HOME/.pnpm-store`,
outside `node_modules`, because declaration generation filters dependency
folders as well. Clean-store preparation and declaration generation are checked
using that layout before updating CI. Once a release is separately approved,
replace the Git pin with the published version and update the lockfile.
A built tarball was used for the initial local integration checks, installed with
`--ignore-scripts`; this does not require publication.

Install browsers through their owning packages rather than the shared binary:

```sh
pnpm -C packages/vite-plugin exec node node_modules/playwright-chromium/cli.js install --no-shell chromium
pnpm -C packages/vite-plugin exec web-ext-firefox install --with-deps
```

OpenPolyfill 0.3.0 and its Playwright 1.64.1 are library implementation details.
Chromium keeps the existing `playwright-chromium` revision, supplied through the
library's `executablePath` option. Firefox's installer resolves its pinned driver
from inside the library. The stock-Firefox smoke keeps using an independent
unmodified Firefox installation.

## Local validation (2026-10-26)

Node 22.23.2, macOS arm64, headless. Comparison uses the same fixture sources,
assertions and browser target before and after the harness change. The Firefox
suite uses Playwright Firefox 157.0; the independent smoke uses Firefox 158.0.1.

| Check | Before | Initial migration |
| --- | --- | --- |
| Chrome unit/output | 172 passed / 0 failed / 1 skipped | 172 / 0 / 1 |
| Firefox output | 64 passed / 0 failed / 1 skipped | 64 / 0 / 1 |
| Chromium E2E | 72 files; 74 passed / 0 failed / 4 skipped | 72 files; 74 / 0 / 4 |
| Firefox E2E | 72 files; 67 passed / 4 failed / 7 skipped | 72 files; 66 / 5 / 7 |

The full local migration runs used the packed library before the final
parent-lookup target-race follow-up. The final Git pin is checked separately by
isolated E2E rechecks and the complete CI matrix.

Local skip counts differ from CI because the existing suite conditions on `CI`.
The baseline Firefox failures were timeouts in React new-tab build, React page
serve and Svelte content HMR, plus the Vue page serve screenshot. Baseline
completeness verification passed: all 72 files/78 tests, no setup failures and
no unhandled errors. The post-migration run completed all 72 files/78 tests with no setup failures
and no unhandled errors. Its five failures were timeouts in Svelte content HMR,
vanilla sequential HMR, Vue content build, dynamic content build and messaging
serve. The baseline's three other failures passed in this run. Both complete
reports are retained locally; these failures are observations, not an allowlist.
All five timeout cases passed in an isolated recheck using the final Git pin
(5 files, 5 passed, 0 failed). This is a filtered recheck, not a replacement for
either complete report. Linux CI results are reported separately.

After migration, the stock-Firefox production smoke passed (1/1), Vite 3 compat
passed (4 passed / 8 existing skips), plugin build and ESLint/typecheck passed.
The local compat matrix also passed on Vite 6.4.1 (6 passed / 6 skipped),
7.3.7 (6 / 6), and 8.1.6 (11 / 1), using the existing version-conditioned tests.
The immutable Git package was separately installed and passed two shared E2E
scenarios in each browser, confirming distribution preparation before publication.
The library's original 17 headless/unit tests passed with both Vitest 3.2.7 and
4.0.18. The final 18-test suite (including the target-replacement race regression)
passed locally on Vitest 4.0.18; its CI checks both versions.

### Output comparison controls

Chrome is compared with Chrome, and Firefox with Firefox. Both targets execute
all their existing output fixtures before and after. All 61 snapshot files for
each target are byte-for-byte unchanged. Firefox retains its `-firefox` suffix;
CSP ports remain normalized as `<port>`. Product source and output tests are
unchanged. Changing the runner's string serializer initially caused mismatches;
explicit `snapshotFormat.escapeString: true` restored the existing format.
No snapshot update was accepted to mask a generated-output difference.

SHA-256 over sorted snapshot paths relative to `tests/out`, a NUL separator and
file contents (both checkouts have identical hashes):

- Chrome: `19f96215405d06fc0816886c0794ccada41073f2361bc8265b5a1210d122b54d`
- Firefox: `be850e6254e1be176bdd2d600c9b1321b06185c34b0721e2c11a9f748802b8a5`

## CI interpretation

The Firefox assertions remain advisory. Its report still fails on missing files,
collection/setup failures, unhandled errors and invalid/missing run reports.
Review actual test counts and assertions from each matrix artifact, not only the
job conclusion. Expected CI baselines are Chromium 71 / 0 / 7 and Firefox
68 / 0 / 10, each covering 72 files / 78 tests. A transient
`listAddons returned an invalid response` is still a setup error if it exhausts
the test's existing retries; this migration adds no retry policy.

CI and publication status are reported separately in the PR. No merge or package
publication is part of this implementation.
