# Local Firefox compatibility results

Local full run on 2026-10-23, macOS arm64, Node 22.23.3, Vite 3.2.11, OpenPolyfill 0.3.0, Playwright 1.64.1 / patched Firefox 157.0. See [README.md](./README.md) for reproduction and the experimental harness.

**72 files / 78 tests: 71 passed, 0 failed, 7 skipped.** Previous complete run: 61 passed / 12 failed / 4 skipped (77 tests). This run adds one regression test for exactly one MAIN-world page reload after a background restart.

Four original skips remain. Three Chrome-only Favicon API checks are now explicitly skipped in Firefox; the browser has no `/_favicon/` endpoint or `favicon` permission ([Mozilla tracking issue](https://bugzilla.mozilla.org/show_bug.cgi?id=1315616)). Their real image-loading assertions remain enabled in Chromium. No other compatibility failure is hidden with a skip or expected-failure marker.

This table records one complete awake run, not a combination of isolated retries. It establishes coverage for these scenarios and browser versions, not universal Firefox parity or a new Linux CI result.

## Validation

- Full Firefox suite: 4 minutes 31 seconds, exit 0. Completeness verification: all 72 files reported, no setup failures, no unhandled errors, no crash.
- Full Chromium suite: 72 files / 78 tests, 74 passed / 0 failed / 4 existing skips, 1 minute 55 seconds. Includes the retained Chrome-only expected-failure regression assertions.
- Unit/output: 170 passed, 1 existing skip, 45 seconds. A separate built-package check also verified a static Firefox sandbox without module scripts exposes no unrelated assets. Package build, TypeScript, targeted ESLint, report syntax and diff checks passed.
- Unmodified Firefox 152.0.6 production smoke passed, including MAIN module import/onExecute and a page-global assertion, alongside background/popup and isolated content-script checks.
- The new Linux/Vite CI matrix result remains pending; this report is local evidence.

The OpenPolyfill migration removes the DuckDuckGo harness and its network helper. Chromium keeps its existing Playwright dependency and runner. Rollup fixtures and dependencies are unchanged.

The first full run after migration reported 69 passed / 2 failed / 7 skipped. Both failures were 15-second Firefox launch timeouts before scenario assertions; the React sandbox passed. A second run was stopped after further startup timeouts and the previously observed duplicate content-script element. The final adapter removes the inherited 15-second launch override and uses Playwright's default launch timeout. It does not add retries or weaken assertions; the duplicate-content-script intermittency is not claimed fixed.

## CI installer follow-up

CI for `1d4ab03f` exposed an installer collision: `pnpm exec playwright` resolved to
`playwright-chromium` 1.61.1 and installed Firefox revision 1532, while OpenPolyfill
required revision 1555 from `@playwright/test` 1.64.1. The suite stopped before
executing tests because the expected `omni.ja` was absent.

The Firefox job and reproduction instructions now invoke `@playwright/test/cli.js`
explicitly. A fresh local browser-cache installation selected Firefox 157.0; the
complete headless suite then passed **71 / 0 / 7** in 4m35s, with all 72 files
reported and no setup/unhandled errors. No product code or assertions changed.
Linux CI remains a separate verification of this installer correction.

## Navigation and report follow-up

CI for `c9da23f8` completed every suite. Firefox/Vite 3 and 6 reported 67 passed,
1 failed, 10 existing skips; both failures were duplicate `#app` elements in the
background-module-cache test. Vite 7 and 8.1 reported 68 passed / 0 failed / 10
skipped. Vite 8.1's execution check incorrectly failed on errors retained from
successful retries (`listAddons` setup errors in three tests).

The background test now waits for page navigation to finish instead of just the
HTTP route being fulfilled. A local probe confirmed the old route notification
arrived before the new document finished loading. Strict single-element and
single-response assertions remain unchanged. The reporter checks final setup
status and retains earlier attempt errors in an explicit retry-details section.

Validation after these corrections:

- Full local headless Chromium: 74 passed / 0 failed / 4 skipped (2m03s).
- Full local headless Firefox with `CI=true`, matching CI conditions: 68 passed /
  0 failed / 10 skipped (3m15s), all 72 files reported, no retained attempt errors
  or unhandled errors. The three extra skips are existing CI-only HMR exclusions.
- Two preceding non-CI Firefox runs each had 68 passed / 3 timeouts / 7 skipped
  in partially different scenarios. Focused checks passed afterwards. These
  intermittent local failures are not claimed fixed by the navigation change.
- Replayed the actual Vite 8.1 JSON artifact through the reporter: accepted the
  final passed results and preserved all four tests' earlier error histories.
  Separate corrupted inputs with a final setup failure, missing test file, or
  unhandled error still failed the verification.

No new retries, skips, assertion relaxations, product or harness changes were
introduced in this follow-up. Remote validation of these corrections is pending.

## Fixes and fixture corrections

- **CRXJS Firefox sandbox modules:** Firefox's opaque sandbox origin cannot load private extension modules. Build output now exposes only the sandbox entry and its transitive JS/CSS/assets through explicit web-accessible resource filenames. The regression checks React rendering, origin `null`, unavailable extension APIs, no wildcard or background exposure, and unchanged Chromium output.

- **CRXJS MAIN modules:** Firefox resolved content-loader relative imports against the host page. An isolated bootstrap now inserts a module with an extension URL, giving imports the correct base while executing user code in MAIN. Production bootstrap resources retain the original registration match patterns. Native MAIN IIFE injection is unchanged.
- **CRXJS MAIN HMR:** Firefox lacks Chrome webpage runtime messaging. A dev-only, one-way bridge forwards extension HMR notifications into MAIN. Page code can request a connected notification but cannot relay extension commands. Existing vanilla/React HMR and page-chrome-mutation assertions pass without replacing HMR with reloads. A new regression checks exactly one reload when the background changes.
- **Messaging dependency:** The Vite messaging fixture now uses native chrome.storage.local callbacks instead of @extend-chrome/storage and its chrome-promise dependency. The background awaits persistence before opening the options page; no dependency transform is needed.
- **Dynamic injection fixture:** Firefox resolves executeScript filenames relative to the calling options page, yielding the incorrect src/assets path. Use explicit root-relative filenames. Start navigation after route setup and assign the tab ID before navigating; remove the obsolete redirect fixture.
- **External HTTP fixture:** intercepted extension-page requests returned a response without CORS headers and did not reach the test route handler. Use a real local HTTP server with CORS and assert both the request and displayed response.
- **IIFE test ordering:** await the automatic runtime reload before querying the replacement background and navigating manually. The old sequence raced CRXJS reload against the test navigation in Chromium and against background evaluation in Firefox.
- Earlier fixes remain covered: Firefox dev HTML/CSP, static background startup, runtime reload replay, background RDP actor replacement, isolated manifest CSS HMR, native Firefox background import assertions and reviewed Vue screenshot references.

## Analysis of the original 28 failing CI cases

Historical baseline: Linux/Vite 3 at 65d9573b (42 passed / 28 failed / 7 CI-conditional skips). Current results below come from this local full run.

| Baseline case | Current result | Classification and evidence |
| --- | --- | --- |
| `mv3-content-script-multiple-registrations/vite-build.test.ts` — content script declared in multiple entries runs on all matched pages | passed | CRXJS fixed: extension-URL module bootstrap plus one-way MAIN HMR bridge. Actual page globals, updates and registration matches remain asserted. |
| `mv3-crx-iframe/vite-serve.test.ts` — crx runs from server output | passed | CRXJS dev HTML/startup fixed; existing functional assertion now passes. |
| `mv3-dynamic-main-world-network-intercept/vite-serve.test.ts` — dynamic IIFE MAIN world content script intercepts host network calls and rebuilds in dev mode | passed | CRXJS runtime reload fixed; the Firefox adapter also follows the replacement background actor for dynamic registration checks. Updated interception is still asserted. |
| `mv3-dynamic-script/vite-build.test.ts` — crx runs from build output | passed | Fixture assumptions fixed: root-relative executeScript paths and navigation after route setup. Both real message and page markers remain asserted. |
| `mv3-dynamic-script/vite-serve.test.ts` — crx runs from server output | passed | Fixture assumptions fixed: root-relative executeScript paths and navigation after route setup. Both real message and page markers remain asserted. |
| `mv3-dynamic-script-iife/vite-serve.test.ts` — iife content script rebuilds on change and works after page reload | passed | Test adapter fixed: polling used the destroyed background RDP actor after restart. Follow replacement actors; the existing rebuilt-bundle and updated-page assertions now pass. |
| `mv3-main-world-content-script-hmr/vite-serve.test.ts` — MAIN world content script updates through HMR without reloading the page | passed | CRXJS fixed: extension-URL module bootstrap plus one-way MAIN HMR bridge. Actual page globals, updates and registration matches remain asserted. |
| `mv3-main-world-content-script-hmr/vite-serve.test.ts` — MAIN world HMR port connects after host page replaces window.chrome | passed | CRXJS fixed: extension-URL module bootstrap plus one-way MAIN HMR bridge. Actual page globals, updates and registration matches remain asserted. |
| `mv3-main-world-network-intercept/vite-serve.test.ts` — manifest-declared IIFE content script rebuilds on change and reloads the page | passed | CRXJS runtime reload fixed; the Firefox adapter also follows the replacement background actor for dynamic registration checks. Updated interception is still asserted. |
| `mv3-main-world-react-content-script-hmr/vite-serve.test.ts` — React MAIN world content script updates through HMR without reloading the page | passed | CRXJS fixed: extension-URL module bootstrap plus one-way MAIN HMR bridge. Actual page globals, updates and registration matches remain asserted. |
| `mv3-messages-esm/vite-build.test.ts` — crx runs from build output | passed | Fixture uses native storage callbacks with error handling; real messages and responses remain asserted. |
| `mv3-messages-esm/vite-serve.test.ts` — crx runs from server output | passed | CRXJS dev HTML/startup fixed; existing functional assertion now passes. |
| `mv3-vanilla-content-script-world-main/vite-serve.test.ts` — content script with world MAIN runs in page context | passed | CRXJS fixed: extension-URL module bootstrap plus one-way MAIN HMR bridge. Actual page globals, updates and registration matches remain asserted. |
| `mv3-vanilla-favicon-popup/vite.test.ts` — Chrome handles popup favicons in serve mode | skipped | Unsupported Chrome API: explicitly skipped only in Firefox; real favicon checks retained in Chromium. |
| `mv3-vanilla-favicon-popup/vite.test.ts` — Chrome handles popup favicons in build mode | skipped | Unsupported Chrome API: explicitly skipped only in Firefox; real favicon checks retained in Chromium. |
| `mv3-vanilla-favicon-test/vite-serve.test.ts` — favicon URLs work in content scripts in serve mode | skipped | Unsupported Chrome API: explicitly skipped only in Firefox; real favicon checks retained in Chromium. |
| `mv3-vite-background-module-cache/vite-serve.test.ts` — background dependency update does not duplicate service worker modules | passed | CRXJS reload fix restores the actual post-update cache assertion; no duplicate-module defect was demonstrated. |
| `mv3-vite-dynamic-content-script-hmr/vite-serve.test.ts` — crx page update on hmr | passed | CRXJS dev HTML/startup fixed; existing functional assertion now passes. |
| `mv3-vite-hmr-background-define/vite-serve.test.ts` — crx runs from server output | passed | CRXJS dev HTML/startup fixed; existing functional assertion now passes. |
| `mv3-vite-hmr-external-xhr/vite-serve.test.ts` — crx runs from server output | passed | Test transport corrected: real local CORS-enabled HTTP endpoint replaces unreliable extension-page interception; request and UI response asserted. |
| `mv3-vite-live-reload-default/vite-serve.test.ts` — liveReload default: background change triggers runtime reload | passed | CRXJS fixed: runtime.reload destroys Firefox content-script timers. Persist connected tab IDs and reload them after the replacement background document loads. |
| `mv3-vite-react-new-tab/vite-serve.test.ts` — crx runs from server output | passed | CRXJS dev HTML/startup fixed; existing functional assertion now passes. |
| `mv3-vite-react-page/vite-serve.test.ts` — crx runs from server output | passed | CRXJS dev HTML/startup fixed; existing functional assertion now passes. |
| `mv3-vite-react-page-hmr/vite-serve.test.ts` — crx page update on hmr | passed | CRXJS dev HTML/startup fixed; existing functional assertion now passes. |
| `mv3-vite-service-worker-recursive-dynamic-import/vite-build.test.ts` — inlines recursive service worker dynamic imports with shared dependencies | passed | Test assumption fixed: Firefox supports native background dynamic imports; listener and nested data assertions retained. |
| `mv3-vite-svelte-page/vite-serve.test.ts` — crx runs from server output | passed | CRXJS dev HTML/startup fixed; existing functional assertion now passes. |
| `mv3-vite-vue-page/vite-serve.test.ts` — crx runs from server output | passed | CRXJS dev HTML/startup fixed; existing functional assertion now passes. Reviewed browser-specific image reference also required. |
| `mv3-vite-vue-page-hmr/vite-serve.test.ts` — crx page update on hmr | passed | CRXJS dev HTML/startup fixed; existing functional assertion now passes. |

## Every test

| Result | File | Scenario | Failure (first line) |
| --- | --- | --- | --- |
| passed | mv3-content-script-iife/vite-build.test.ts | IIFE content scripts are bundled correctly |  |
| passed | mv3-content-script-iife/vite-serve.test.ts | IIFE content scripts work in dev mode |  |
| passed | mv3-content-script-manifest-css-hmr/vite-serve.test.ts | manifest CSS in content_scripts supports HMR |  |
| passed | mv3-content-script-manifest-css-multiple/vite-serve.test.ts | multiple JS content scripts with multiple CSS files work correctly |  |
| passed | mv3-content-script-no-war-entry/vite-build.test.ts | simple content script entry is not in web_accessible_resources |  |
| passed | mv3-crx-iframe/vite-build.test.ts | crx runs from build output |  |
| passed | mv3-crx-iframe/vite-serve.test.ts | crx runs from server output |  |
| passed | mv3-content-script-manifest-css/vite-build.test.ts | CSS declared in manifest content_scripts is applied |  |
| passed | mv3-content-script-manifest-css/vite-serve.test.ts | CSS declared in manifest content_scripts is applied in dev mode |  |
| passed | mv3-content-script-multiple-registrations/vite-build.test.ts | content script declared in multiple entries runs on all matched pages |  |
| passed | mv3-dynamic-main-world-network-intercept/vite-build.test.ts | dynamic IIFE MAIN world content script intercepts host fetch and XHR at document_start |  |
| passed | mv3-dynamic-main-world-network-intercept/vite-serve.test.ts | dynamic IIFE MAIN world content script intercepts host network calls and rebuilds in dev mode |  |
| passed | mv3-main-world-content-script-hmr/vite-serve.test.ts | MAIN world content script updates through HMR without reloading the page |  |
| passed | mv3-main-world-content-script-hmr/vite-serve.test.ts | MAIN world HMR port connects after host page replaces window.chrome |  |
| passed | mv3-main-world-content-script-hmr/vite-serve.test.ts | MAIN world reloads once when the background restarts |  |
| passed | mv3-dynamic-script-iife/vite-build.test.ts | crx runs from build output |  |
| passed | mv3-dynamic-script-iife/vite-serve.test.ts | iife content script rebuilds on change and works after page reload |  |
| passed | mv3-main-world-network-intercept/vite-build.test.ts | IIFE MAIN world content script intercepts host fetch and XHR at document_start |  |
| passed | mv3-main-world-network-intercept/vite-serve.test.ts | IIFE MAIN world content script intercepts host fetch and XHR at document_start in dev mode |  |
| passed | mv3-main-world-network-intercept/vite-serve.test.ts | manifest-declared IIFE content script rebuilds on change and reloads the page |  |
| passed | mv3-dynamic-script/vite-build.test.ts | crx runs from build output |  |
| passed | mv3-dynamic-script/vite-serve.test.ts | crx runs from server output |  |
| passed | mv3-messages-esm/vite-build.test.ts | crx runs from build output |  |
| passed | mv3-messages-esm/vite-serve.test.ts | crx runs from server output |  |
| passed | mv3-main-world-react-content-script-hmr/vite-serve.test.ts | React MAIN world content script updates through HMR without reloading the page |  |
| passed | mv3-two-entrypoints-at-once/vite-serve.test.ts | hmr updates two content scripts and a shared dependency at once |  |
| passed | mv3-vanilla-content-script-world-main/vite-build.test.ts | content script with world MAIN builds correctly |  |
| passed | mv3-vanilla-content-script-world-main/vite-serve.test.ts | content script with world MAIN runs in page context |  |
| passed | mv3-vite-background-module-cache/vite-serve.test.ts | background dependency update does not duplicate service worker modules |  |
| skipped | mv3-vanilla-favicon-popup/vite.test.ts | Chrome handles popup favicons in serve mode |  |
| skipped | mv3-vanilla-favicon-popup/vite.test.ts | Chrome handles popup favicons in build mode |  |
| skipped | mv3-vanilla-favicon-test/vite-serve.test.ts | favicon URLs work in content scripts in serve mode |  |
| passed | mv3-vite-bundled-dev-content-script/vite-serve.test.ts | content script runs with Vite bundled dev mode |  |
| passed | mv3-vite-dynamic-content-script-build-watch/vite-build-watch.test.ts | crx page update on build --watch |  |
| passed | mv3-vite-dynamic-content-script-hmr/vite-serve.test.ts | crx page update on hmr |  |
| passed | mv3-vite-hmr-background-define/vite-serve.test.ts | crx runs from server output |  |
| passed | mv3-vite-hmr-external-xhr/vite-serve.test.ts | crx runs from server output |  |
| passed | mv3-vite-live-reload-disabled/vite-serve.test.ts | liveReload false: background change does not trigger runtime reload |  |
| passed | mv3-vite-live-reload-default/vite-serve.test.ts | liveReload default: background change triggers runtime reload |  |
| passed | mv3-vite-react-content-script/vite-build.test.ts | crx runs from build output |  |
| passed | mv3-vite-react-content-script/vite-serve.test.ts | crx runs from server output |  |
| passed | mv3-vite-react-content-script-hmr/vite-serve.test.ts | crx page update on hmr |  |
| passed | mv3-vite-react-content-script-seq-hmr/vite-serve.test.ts | crx page update on hmr |  |
| passed | mv3-vite-react-new-tab/vite-build.test.ts | crx runs from build output |  |
| passed | mv3-vite-react-new-tab/vite-serve.test.ts | crx runs from server output |  |
| passed | mv3-vite-react-page/vite-build.test.ts | crx runs from build output |  |
| passed | mv3-vite-react-page/vite-serve.test.ts | crx runs from server output |  |
| passed | mv3-vite-react-page-hmr/vite-serve.test.ts | crx page update on hmr |  |
| passed | mv3-vite-react-sandbox/vite-build.test.ts | crx runs from build output |  |
| skipped | mv3-vite-react-sandbox/vite-serve.test.ts | crx runs from server output |  |
| passed | mv3-vite-service-worker-dynamic-import/vite-build.test.ts | keeps listeners when dynamic data is shared with a content script |  |
| passed | mv3-vite-service-worker-recursive-dynamic-import/vite-build.test.ts | inlines recursive service worker dynamic imports with shared dependencies |  |
| passed | mv3-vite-react-content-script-i18next-hmr/vite-serve.test.ts | updates react-i18next translations through HMR |  |
| passed | mv3-vite-react-content-script-i18next-hmr/vite-serve.test.ts | loads updated react-i18next translations after a page reload without restarting Vite |  |
| passed | mv3-vite-svelte-content-script/vite-build.test.ts | crx runs from build output |  |
| passed | mv3-vite-svelte-content-script/vite-serve.test.ts | crx runs from server output |  |
| passed | mv3-vite-svelte-content-script-hmr/vite-serve.test.ts | crx page update on hmr |  |
| passed | mv3-vite-svelte-page/vite-build.test.ts | crx runs from build output |  |
| passed | mv3-vite-svelte-page/vite-serve.test.ts | crx runs from server output |  |
| skipped | mv3-vite-svelte-page-hmr/vite-serve.test.ts | crx page update on hmr |  |
| passed | mv3-vite-unocss-hmr/vite-serve.test.ts | unocss styles update on hmr |  |
| passed | mv3-vite-vanilla-content-script-module-api/vite-build.test.ts | content script export runs when script is injected |  |
| passed | mv3-vite-vanilla-content-script-module-api/vite-serve.test.ts | content script export runs when script is injected |  |
| passed | mv3-vite-vanilla-content-script-module-singleton/vite-serve.test.ts | crx page update on hmr |  |
| passed | mv3-vite-vanilla-content-script-seq-hmr/vite-serve.test.ts | crx page update on hmr |  |
| passed | mv3-vite-vanilla-content-script-hmr/vite-serve.test.ts | crx page update on hmr |  |
| passed | mv3-vite-virtual-css-hmr/vite-serve.test.ts | virtual css module updates on hmr |  |
| passed | mv3-vite-vue-content-script/vite-build.test.ts | crx runs from build output |  |
| passed | mv3-vite-vue-content-script/vite-serve.test.ts | crx runs from server output |  |
| passed | mv3-vite-vue-content-script/vite-serve.test.ts | no output files contain Windows-illegal characters |  |
| passed | mv3-vite-vue-content-script-hmr/vite-serve.test.ts | crx page update on hmr |  |
| passed | mv3-vite-vue-page/vite-build.test.ts | crx runs from build output |  |
| passed | mv3-vite-vue-page/vite-serve.test.ts | crx runs from server output |  |
| skipped | p3__mv3-messages-iife/vite-build.test.ts | crx runs from build output |  |
| skipped | p3__mv3-messages-iife/vite-serve.test.ts | crx runs from server output |  |
| passed | mv3-vite-vue-page-hmr/vite-serve.test.ts | crx page update on hmr |  |
| passed | mv3-web-accessible-resources/vite-build.test.ts | crx runs from build output |  |
| passed | mv3-web-accessible-resources/vite-serve.test.ts | crx runs from server output |  |

## Parallel output ports and background HMR readiness (2026-10-26)

[CI run 40310383728](https://github.com/crxjs/chrome-extension-tools/actions/runs/40310383728)
at `0e9259a7` exposed two test synchronization/normalization defects:

- Ubuntu's output job passed its Chrome run, then failed 19 Firefox snapshots
  solely because the dev CSP contained `localhost:5201` or `5202` rather than
  `5200`. The previous normalizer handled script/HTML contents but omitted the
  manifest. Three local workers reproduced the failure (21 affected tests;
  scheduling changes which fixtures receive a different port). The helper now
  normalizes only localhost port numbers in development CSP expectations;
  protocol, host, directives and allowed sources remain visible. No snapshots
  or product CSP were changed.
- Chromium/Vite 7 passed 70 tests with 7 existing skips but timed out waiting for
  navigation in the background-module-cache test. Delaying the real WebSocket
  upgrade by three seconds reproduced the same timeout: initial extension
  runtime messaging worked, but the reload was broadcast to zero HMR clients.
  Waiting for an HMR client before updating the dependency made that controlled
  reproduction pass, with the broadcast reaching one client. The single-element
  and single-response assertions remain unchanged; no retry/skip was added.
- The Windows output job was canceled before completing its assertions. Firefox
  E2E jobs were skipped because the prerequisite checks failed.

Local validation with Node 22.23.2:

- Unit/output on Vite 3 with three workers, no snapshot update: Chrome
  **172 passed / 0 failed / 1 existing skip**; Firefox **64 / 0 / 1**.
- Complete headless Chromium E2E on Vite 7: **71 / 0 / 7**, all 72 files reported.
- TypeScript and targeted ESLint passed. Diagnostic upgrade delays and logs
  were confined to the isolated reproduction and are absent from the PR.
- Complete headless Firefox E2E on Vite 7 with `CI=true`: **68 / 0 / 10**;
  the execution report accepted all 72 files. The required local Playwright
  Firefox revision was installed after the initial setup-only ENOENT failure.

These fixes change only tests/helpers. Product code, snapshot expectations,
browser versions, retries and skips are unchanged. Remote CI after the push is
separate validation of the Ubuntu and Windows environments.
