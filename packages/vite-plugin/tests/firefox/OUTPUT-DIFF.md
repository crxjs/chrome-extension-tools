# Output comparison before and after Firefox compatibility fixes

This compares each browser target against itself before and after the product
changes. It does **not** compare Chrome output with Firefox output.

- Test fixtures, assertions, snapshot selection and normalization: `3bd2d324` in both runs.
- Before: replace only `packages/vite-plugin/src` with its exact tree from PR base `a7228f49`.
- After: restore that source tree from `3bd2d324` (Firefox fixes plus comments).
- Both runs use the same isolated directory, Node installation, lockfile, dependencies and Vite 3.
- Run the real output suite, not the browser harness. No product changes were made during this comparison.

Generate each target's expectations using the **before** source tree. Restore
the **after** source tree and run without `--update` (`CI=true`):

| Target | Before expectations | After code against before expectations | Snapshot files requiring update |
| --- | --- | --- | --- |
| Chrome | 64 passed, 1 existing skip | 64 passed, 1 existing skip | **0 / 61** |
| Firefox | 64 passed, 1 existing skip | **33 failed**, 31 passed, 1 existing skip | **33 / 61**: 31 serve, 2 build |

After updating only the Firefox expectations, a separate run **without**
`--update` passed: **64 tests, 1 existing skip**. Chrome needed no update.

[Complete before → after snapshot diff](./output-before-after.patch)

## Visible changes

| Area | Before | After |
| --- | --- | --- |
| Firefox dev CSP | No local Vite script origin added | `script-src` explicitly permits the local Vite origin |
| Firefox dev background loader | Top-level dynamic `import(...)` calls | Static imports for env, HMR client and background entry |
| Firefox dev HTML | Loading placeholder and `loading-page` asset | Transformed fixture HTML with local Vite asset URLs; the placeholder asset disappears |
| Firefox isolated manifest CSS in dev | Manifest injects original stylesheet | HMR loader owns the stylesheet; original CSS entry is removed where applicable |
| Firefox MAIN modules | MAIN-registered relative-import loaders | ISOLATED bootstrap inserts an extension module URL; user module still executes in MAIN |
| Firefox MAIN dev messaging | Adds `externally_connectable` manifest matches | Uses the isolated one-way HMR bridge instead |
| Firefox production sandbox | No sandbox module graph in web-accessible resources | Adds the sandbox entry/dependency graph; unrelated background entry remains private |
| Chrome output | Existing generated files and contents | Unchanged against the expectations generated in the same directory |

The **two production snapshot changes** are `content-script-multiple-registrations`
and `main-world-sandbox`. Static MAIN scripts without module-loader requirements
retain their production output. Other changed snapshots are development output.

## Review observations

The new development HTML in fixtures such as `basic-js` includes **two**
`/@vite/client` script tags. This is visible in the full patch and is not hidden
by snapshot normalization. It warrants a separate check; this comparison does
not fix or establish the runtime impact of that duplication.

Snapshots retain the suite's existing hash normalization. HMR tokens and inline
script cache-buster timestamps are normalized identically before and after.
Bundled vendor/HMR client sources are omitted by the existing output helper;
this comparison therefore does not show every runtime HMR implementation change.

## Changed Firefox snapshot files

The full patch includes all contents, including repeated loading-page deletions.
The names below are shared fixture directories under `tests/out`.

| Fixture | Changed modes |
| --- | --- |
| `basic-js` | serve |
| `basic-js-optional-host-permissions` | serve |
| `basic-ts` | serve |
| `content-script-module-api` | serve |
| `content-script-multiple-registrations` | build, serve |
| `content-script-world-main` | serve |
| `content-script-world-main-all-urls` | serve |
| `dynamic-script` | serve |
| `dynamic-script-iife` | serve |
| `loading-page-readiness` | serve |
| `main-world-sandbox` | build, serve |
| `vite-content-script-css-imports` | serve |
| `vite-content-script-css-imports-2` | serve |
| `vite-content-script-css-imports-3` | serve |
| `vite-content-script-manifest-css` | serve |
| `vite-declared-script-resources` | serve |
| `vite-dynamic-script-resources` | serve |
| `vite-dynamic-script-resources-minify` | serve |
| `vite-react-fast-refresh` | serve |
| `vite-self-directive-in-csp` | serve |
| `vite-svelte` | serve |
| `vite-underscore-css-filename` | serve |
| `with-circular-deps` | serve |
| `with-copied-assets` | serve |
| `with-https-server` | serve |
| `with-manifest-url-fragment` | serve |
| `with-manifest-url-query-string` | serve |
| `with-public-dir` | serve |
| `with-sourcemaps-inline` | serve |
| `with-sourcemaps-separate` | serve |
| `with-web-accessible-html` | serve |
