---
'@crxjs/vite-plugin': patch
---

Fix Firefox development startup, extension-page loading, runtime reloads and manifest CSS HMR. Permit the local Vite origin for temporary development extensions, use static background dependencies so installation listeners register in time, and emit transformed HTML with local-server asset URLs while preserving extension navigation.

Restore connected tabs after background restarts and let the isolated-world HMR loader own development manifest CSS so stale styles cannot override updates.

Load Firefox MAIN-world content modules through an isolated bootstrap with an extension module URL. Forward development HMR notifications through a one-way page bridge instead of Chrome-only webpage runtime messaging. Preserve native MAIN IIFE injection, production CSP and Chromium behavior.

Expose the bundled dependency graph of Firefox sandbox pages so opaque-origin module loading works, while retaining sandbox isolation and keeping unrelated extension entries private.
