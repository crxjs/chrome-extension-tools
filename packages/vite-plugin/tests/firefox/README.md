# Firefox E2E

Related: [#1251](https://github.com/crxjs/chrome-extension-tools/issues/1251),
following [#1222](https://github.com/crxjs/chrome-extension-tools/issues/1222).

The complete local compatibility table is in [RESULTS.md](./RESULTS.md).

## Run the complete shared suite

Use Node.js 22 (matching CI). From the repository root:

```sh
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 pnpm install --frozen-lockfile
pnpm -C packages/vite-plugin exec web-ext-firefox install --with-deps
pnpm -C packages/vite-plugin test:firefox:e2e
# Run even when the test command exits nonzero:
pnpm -C packages/vite-plugin test:firefox:report
```

The library's installer resolves its pinned Playwright CLI. Chromium is installed
separately through `node node_modules/playwright-chromium/cli.js install --no-shell chromium`;
neither installer depends on the shared `playwright` executable.

`test:firefox:e2e` runs the same Vitest discovery, fixture sources and assertions
as `test:run:e2e`, sequentially in Vitest forks (`fileParallelism: false`) using the library's
`web-ext` custom environment, which owns driver teardown. This includes build, development, HMR, framework and screenshot
scenarios. It returns a nonzero exit code for failing tests. Optional Vitest CLI
arguments are forwarded (for example a filename for diagnosis). The report
command requires the **complete** suite, so a filtered run fails its completeness
check. Results are written to `artifacts/full-suite.json` and `full-suite.md`.

On macOS, prevent automatic sleep during a long local run with
`caffeinate -is pnpm -C packages/vite-plugin test:firefox:e2e` from the repository
root. Sleep/wake cycles can distort timeout results and reported duration.

The shared runner selects Firefox with `E2E_BROWSER=firefox`. Fixture options
select CRXJS's Firefox target and adapt the manifest's background entry from
`service_worker` to `scripts`. Shared listener checks use `hasListener(listener)`
in both browsers, and URL checks select the browser's extension scheme. Page lookup
accepts `moz-extension://`. A Firefox background page
provides the `evaluate()` operations used by the shared service-worker helper;
this does **not** establish Chromium service-worker lifecycle parity.

The `vitest-environment-web-ext` library owns browser launch, temporary extension
installation (including extensions without a background), isolated profiles and
debugger ports, background evaluation, actor replacement after runtime reload,
and cleanup. CRXJS keeps fixture builds, dev servers, assertions and report
completeness checks. The deleted `runner.ts` and `setup.mjs` have no replacements
inside this repository.

OpenPolyfill 0.3.0 and Playwright 1.64.1 are implementation dependencies of the
library. `run-suite.mjs` calls its public `prepareFirefox()` and `getFirefoxInfo()`
helpers; the environment also prepares Firefox during launch. Installation with
`--ignore-scripts` works when using a built package. The temporary Git dependency
must run its build during installation; pnpm explicitly permits that package in
`onlyBuiltDependencies`. Chromium retains its existing `playwright-chromium`
binary, selected through the library's `playwright.executablePath` option.

Vitest 3.2.7 resolves its own compatible Vite independently of the Vite dependency
used by the plugin and fixtures. The plugin still builds on Vite 3 and is tested
on Vite 3, 6, 7 and 8.1. No global Vite override is used. Snapshot escaping is
explicitly kept at its old setting, so the migration requires no output snapshot
updates. See [INTEGRATION.md](./INTEGRATION.md) for migration validation and the
unpublished library dependency.

**This is an experimental test environment.** OpenPolyfill patches Playwright's
selector bundle and cached Firefox resources (`omni.ja` and `playwright.cfg`).
It does not modify system Firefox or disable extension CSP. It has no DuckDuckGo
network helper or local interception server. These results remain distinct from
the unmodified-Firefox smoke below. Upgrading either pinned package requires
rechecking patch compatibility and the complete suite.

Firefox sandbox pages use an opaque origin. Production builds expose only their
bundled dependency graphs as web-accessible resources, with `<all_urls>` matching
because their opaque origin cannot match an extension origin. Unrelated background
entries remain private. The sandbox test asserts rendered React content, origin
`null`, unavailable extension APIs, and absence of wildcard/background resources.
Chromium output is unchanged.

Three Chrome Favicon API assertions are explicitly skipped in Firefox: Firefox
has no `/_favicon/` endpoint or `favicon` permission ([Mozilla tracking issue](https://bugzilla.mozilla.org/show_bug.cgi?id=1315616)).
These remain real image-loading assertions in Chromium. Other existing suite skips
are retained; compatibility failures are not marked as expected failures. The two Chromium-specific `test.fails` regression
markers run as ordinary tests in Firefox, so unrelated failures cannot appear
as passes. Firefox background documents are checked for working listeners and imported data;
the import-inlining assertions apply only to Chrome service workers. The Vue
production and development pages have reviewed Firefox screenshot references;
other screenshot comparisons still use the existing references, so visual failures
must be reviewed separately from functional ones. The messaging fixture uses native `chrome.storage.local` callbacks, including
`runtime.lastError` handling. The background persists the tab ID before opening
the options page, which reads it directly; no storage wrapper or dependency transform is needed. The dynamic
injection fixture uses root-relative filenames and starts navigation after route
setup. The external HTTP fixture uses a real local server with CORS, avoiding the
experimental adapter's unreliable interception of extension-page requests.

Firefox dev manifests explicitly permit the local Vite origin in `script-src`
([Firefox 147+ temporary extensions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Content_Security_Policy#scripts_from_localhost)). Background dependencies use static imports in order: environment,
HMR client, then user entry, so startup listeners are registered before installation
events. Firefox dev HTML is transformed by Vite and written into the extension;
asset URLs point to the local server while extension navigation retains its origin.
This includes HTML supplied through build inputs and rewrites HTML on edits.
Asset modules copied into content scripts retain extension-relative URLs for
`runtime.getURL()`. Reload tests subscribe before updating files and only expect
Chrome to close options tabs; Firefox still has to reload the content page.
On Firefox, the background persists connected tab IDs before runtime reload and
reloads those tabs after the replacement background document loads. Content-script
timers cannot survive that restart. The test adapter also follows replacement RDP
background actors. Isolated-world manifest CSS uses the HMR loader in development
so the original manifest stylesheet does not override updates.
Firefox MAIN-world modules now use an isolated loader that inserts an extension
module URL into the page. Relative imports resolve against that module URL.
A dev-only, one-way message bridge forwards HMR notifications from the extension
to MAIN; page code can request a connected notification but cannot relay commands
to extension APIs. Native MAIN IIFEs remain native manifest scripts.
Production CSP and Chromium manifests are unchanged.

## Firefox-only product code

These are browser compatibility paths, separate from the OpenPolyfill test
harness. Inline comments identify the reason at each integration point.

| Path under `src/` | Mode | Firefox requirement |
| --- | --- | --- |
| `node/plugin-background.ts` | serve | Allow the local Vite origin in CSP and register startup listeners through static imports. |
| `node/plugin-manifest.ts`, `node/html.ts` | serve | Emit transformed extension HTML with Vite asset URLs; retain extension-relative content assets and let HMR own isolated CSS. |
| `client/es/hmr-client-worker.ts` | serve | Restore connected tabs after the background document restarts. |
| `client/es/hmr-content-port.ts` | serve | Receive MAIN-world HMR through the isolated bridge. |
| `client/iife/content-firefox-main-bridge.ts`, `node/contentScripts.ts`, `node/plugin-contentScripts.ts` | serve + build | Bootstrap MAIN modules through an isolated script; forward HMR only in serve mode. Native MAIN IIFEs keep their existing path. |
| `node/plugin-webAccessibleResources.ts` | build | Expose sandbox module dependency graphs to their opaque origin. |

### Output snapshots

Every shared `tests/out` fixture runs for both Chrome and Firefox. The existing
snapshot names remain the Chrome baseline; Firefox adds a `-firefox` suffix in
the same directory, for example:

```text
basic-js/__snapshots__/build.test.ts.snap
basic-js/__snapshots__/build.test.ts-firefox.snap
basic-js/__snapshots__/serve.test.ts.snap
basic-js/__snapshots__/serve.test.ts-firefox.snap
```

The options provider adapts the browser target and background manifest format;
the fixture sources and assertions are shared. The `main-world-sandbox` fixture
also covers the production MAIN bootstrap and sandbox graph for both targets.
No browser or OpenPolyfill installation is required to inspect generated output.

```sh
# Standard local and CI command: unit/output baseline, then Firefox outputs.
pnpm -C packages/vite-plugin test:run:out
# Update both sets after reviewing the differences.
pnpm -C packages/vite-plugin test:run:out --update
# Select one fixture in both targets.
pnpm -C packages/vite-plugin test:run:out tests/out/basic-js
# Direct Firefox-only run (POSIX shell).
OUTPUT_BROWSER=firefox pnpm -C packages/vite-plugin exec vitest --run --mode out
```

The runner forwards Vitest arguments to both runs and fails if either run fails.
Firefox runs only the output files; the unit tests run once with the baseline.
HMR tokens are normalized in the output helper so bridge snapshots are stable.

The product regression comparison now holds the browser target and tests fixed
and swaps only the CRXJS source tree: PR base `a7228f49` → `3bd2d324`.
Chrome retains all 61 snapshot files unchanged. Firefox requires updates to 33
files (31 serve, 2 build). The earlier Chrome-versus-Firefox RED run did not prove
this before/after comparison.

See [OUTPUT-DIFF.md](./OUTPUT-DIFF.md) for the controlled test results, changed
fixtures, review observations and the [complete diff](./output-before-after.patch).

The output helper omits the bundled HMR clients from source snapshots. Real
browser E2E tests cover their runtime behaviour; unchanged output snapshots alone
do not establish Firefox compatibility.

## CI and interpretation

After the existing checks pass, CI runs both the stock-Firefox smoke test and the
complete shared suite on Linux with Vite 3, 6, 7 and 8.1. The shared suite is
**advisory while compatibility is being established**: failed assertions remain
visible in the step output, job summary, JSON report and image-diff artifacts.
They do not block the matrix job. The subsequent report step fails the job if any
test file was not reported, a suite failed to collect, browser/extension setup still failed after the configured attempts, or Vitest reported
runtime errors. Missing/invalid reports also fail. Earlier errors from tests that
passed an existing retry remain visible in the report, but do not indicate missing
execution. This runner adds no retries. There is no failure allowlist.

The stock-Firefox smoke test remains required. Artifacts are uploaded for every
run and retained for seven days. The job has a 90-minute upper bound because all
existing per-test timeouts still apply; there is no fail-fast or bail setting.

## Stock Firefox production smoke test

```sh
pnpm -C packages/vite-plugin build
pnpm -C packages/vite-plugin test:firefox
```

This separate Node/Selenium test loads a production MV3 extension in unmodified
headless Firefox. It checks module background scripts, popup messaging/storage,
an isolated content script with an imported module, and a MAIN-world module with
an imported dependency and `onExecute`, verified through a page-global value on
a local HTTP page.

`FIREFOX_BINARY` selects a Firefox executable. Selenium Manager finds or downloads
geckodriver; `GECKODRIVER` can select an existing driver. Its
`--allow-system-access` flag is required for Firefox 153+ to navigate to extension
pages ([Mozilla bug 2048451](https://bugzilla.mozilla.org/show_bug.cgi?id=2048451)).
The test clears `artifacts/` before running, so run it **before** the shared suite
if retaining both sets of diagnostics. CI uses this ordering.
