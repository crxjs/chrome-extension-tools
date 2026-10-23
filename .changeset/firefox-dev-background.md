---
'@crxjs/vite-plugin': patch
---

Fix Firefox development startup, extension-page loading, runtime reloads and manifest CSS HMR. Permit the local Vite origin for temporary development extensions, use static background dependencies so installation listeners register in time, and emit transformed HTML with local-server asset URLs while preserving extension navigation.
