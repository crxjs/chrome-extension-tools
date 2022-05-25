---
"@crxjs/vite-plugin": patch
---

Automatically ignores `build.outDir` for server HMR, so the file writer doesn't trigger a full reload.

Fixes flaky HMR updates for content scripts; Tailwind should work fine now 🥳
