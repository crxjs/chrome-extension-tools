---
"@crxjs/vite-plugin": patch
---

fix: respect user's build.manifest setting in Vite 4+

When users set `build.manifest: false` in their Vite config, the Vite manifest file (`.vite/manifest.json` in Vite 5+, or `manifest.json` in older versions) is now properly removed from the output bundle.

CRXJS internally requires the Vite manifest to derive content script resources during build, so it forces `build.manifest: true`. Previously, this meant the Vite manifest was always included in the output even if the user explicitly disabled it. Now, CRXJS removes the manifest from the bundle after processing if the user didn't want it.

Closes #1077
