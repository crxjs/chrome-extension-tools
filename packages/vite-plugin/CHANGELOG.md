# @crxjs/vite-plugin

## 2.0.0-beta.24

### Patch Changes

- b0ba786: fix: monorepo hmr

## 2.0.0-beta.23

### Patch Changes

- cc76555: fix: hmr error

## 2.0.0-beta.22

### Patch Changes

- ce9fe1c: Fix/web accessible resources script modules
- 48d8c68: Vite 5 moved vite manifest from 'manifest.json' to
  '.vite/manifest.json'. This change updates the plugin to use the new location
  if Vite major version is >4, old location otherwise.

## 2.0.0-beta.21

### Patch Changes

- cbfd0b3: Delete invalid changeset

## 2.0.0-beta.20

### Patch Changes

- f5c4bd7: fix: background scripts for firefox build

## 2.0.0-beta.19

### Patch Changes

- 34980de: feat: add compatibility mode for Firefox

## 2.0.0-beta.18

### Patch Changes

- 47eeda7: fix(package): update cjs export path
- 557721e: fix: infinite recursion on circular dependency
- a6ee0d2: Test: infinite recursion on circular dependency

## 2.0.0-beta.17

### Patch Changes

- 936ed77: Add inline sourcemap support to content scripts
- bbc4d33: fix: schema of input_components

## 2.0.0-beta.16

### Patch Changes

- 1728bdd: Add newline to generated manifest.json (issue #668)
- 00be1a1: fix: add new screenshot and remove the redudant code
- 42baebb: React v18 ReactDOM.render changes
- a4982e3: Add content script module API

## 2.0.0-beta.15

### Patch Changes

- ca0dfee: WIP: fix HMR singleton issue

## 2.0.0-beta.14

### Patch Changes

- 3dea230: Add tip `type: module` to vue page

## 2.0.0-beta.13

### Patch Changes

- 3cf9305: Fix content scripts hmr

## 2.0.0-beta.12

### Patch Changes

- d0de5c8: fix: reset contentScripts when main plugin is initialized

## 2.0.0-beta.11

### Patch Changes

- ec2b79c: fix: avoid waiting for fileReady when serving
- 0b69ce7: temporary fix for dynamic imports

## 2.0.0-beta.10

### Patch Changes

- 06c9c86: fix: pass war through a set to dedupe

## 2.0.0-beta.9

### Patch Changes

- af2fdbc: fix: filter out vite serve plugin context

## 2.0.0-beta.7

### Patch Changes

- badc910: fix: maintain ; and , during minification
- 5ac019d: React conflicts with preact

## 2.0.0-beta.6

### Patch Changes

- cbce5e1: Hotfix background

## 2.0.0-beta.5

### Patch Changes

- 088ab78: fix: build is broken when using minify with dynamic modules (#573)

## 2.0.0-beta.4

### Patch Changes

- d7949bf: Fix commonjs export

## 2.0.0-beta.3

### Patch Changes

- ec9e879: chore: move rxjs to package.deps

## 2.0.0-beta.2

### Patch Changes

- 53534d0: Remove peerDeps, optDeps, engines

## 2.0.0-beta.1

### Major Changes

- 628b14f: ## Vite 3 support and new file writer

  This release adds Vite 3 support and includes a complete rewrite of the
  content script file writer. There are no intentional breaking changes, but
  Vite 3 support required significant changes under the hood, therefore this is
  a major release.

## 1.1.0-beta.0

### Minor Changes

- 9b0381b: Add Svelte support

## 1.0.14

### Patch Changes

- 01f8e37: Allow <all_urls> in content_scripts.matches section of manifest.json
- a65fe1f: CRXJS isn't fully compatible with Vite 3

## 1.0.13

### Patch Changes

- 68c661f: Support Vite 3
- a8d5670: Fixed the npm link of the npm badge.

## 1.0.12

### Patch Changes

- 0027f1e: Fix manifest icons type

## 1.0.11

### Patch Changes

- dc479d1: Fix global constant replacement in background

## 1.0.10

### Patch Changes

- f35c49e: Update READMEs

## 1.0.9

### Patch Changes

- 8941353: Remove & refactor use of fs-extra

## 1.0.8

### Patch Changes

- 8a09cb9: Optimize rollup input

## 1.0.7

### Patch Changes

- e1604d8: Strip paths from content script resource match patterns

## 1.0.6

### Patch Changes

- 63d102f: Automatically ignores `build.outDir` for server HMR, so the file
  writer doesn't trigger a full reload.

  Fixes flaky HMR updates for content scripts; Tailwind should work fine now 🥳

- a1e2728: Fix isImporter recursion

## 1.0.5

### Patch Changes

- 86adbec: Sometimes during development, an extension page may open before the
  service worker has a chance to control fetch. The HTML file will load from the
  file system, but the script tag might load from the dev server. This PR adds a
  precontroller loader plugin to the dev server so that the extension page will
  reload and the fetch handler will get the real HTML file from the server.

## 1.0.4

### Patch Changes

- b83a4bd: Check for manifest assets first in the project root, then check in
  the public dir. Throw an informative error if the file does not exist in
  either dir.

## 1.0.3

### Patch Changes

- 8b2e587: check service worker on interval from extension page

## 1.0.2

### Patch Changes

- be8a1de: Remove unused code that throws when web accessible resources contains
  an HTML file.

## 1.0.1

### Patch Changes

- d2b4f9e: feat: allow hash in manifest html urls
