# Firefox E2E

Related: [#1251](https://github.com/crxjs/chrome-extension-tools/issues/1251),
following [#1222](https://github.com/crxjs/chrome-extension-tools/issues/1222).

The complete local compatibility table is in [RESULTS.md](./RESULTS.md).

## Run the complete shared suite

Use Node.js 22 (matching CI). From the repository root:

```sh
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 pnpm install --frozen-lockfile --ignore-scripts
pnpm -C packages/vite-plugin exec playwright install --with-deps firefox
pnpm -C packages/vite-plugin test:firefox:e2e
# Run even when the test command exits nonzero:
pnpm -C packages/vite-plugin test:firefox:report
```

`test:firefox:e2e` runs the same Vitest discovery, fixture sources and assertions
as `test:run:e2e`, sequentially in the main Vitest process (`--threads false`)
to keep the Firefox driver lifecycle outside worker teardown. This includes build, development, HMR, framework and screenshot
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

The runner uses DuckDuckGo's experimental
[firefox-webext-playwright-harness](https://github.com/duckduckgo/firefox-webext-playwright-harness),
pinned to commit `1df36079857205ba6ae995ff5936124ecdc32896`, with Playwright 1.61.1.
It installs real temporary extensions through Mozilla's RDP client from
`web-ext`. Content-script-only production fixtures use that client directly,
since the upstream harness requires a background page. Each test gets an isolated
profile and debugger port; cleanup closes the browser, RDP connection, helper
server and profile, including after assertion failures.

**This is an experimental test environment.** The library patches the downloaded
Playwright Firefox binary (`omni.ja` and `playwright.cfg`) to expose extension pages
and enable its privileged network helper. It does not modify the system Firefox,
but it does modify Playwright's cached Firefox installation. It does not disable
the extension's CSP. These results are distinct from the stock-Firefox smoke test
below. Updating Playwright or the pinned harness requires rerunning this suite.

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

## CI and interpretation

After the existing checks pass, CI runs both the stock-Firefox smoke test and the
complete shared suite on Linux with Vite 3, 6, 7 and 8.1. The shared suite is
**advisory while compatibility is being established**: failed assertions remain
visible in the step output, job summary, JSON report and image-diff artifacts.
They do not block the matrix job. The subsequent report step fails the job if any
test file was not reported, a suite failed to collect, browser/extension setup failed, or Vitest reported
runtime errors. Missing/invalid reports also fail. There is no failure allowlist.

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
