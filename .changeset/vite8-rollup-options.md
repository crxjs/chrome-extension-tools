---
'@crxjs/vite-plugin': patch
---

Filter Vite 8/Rolldown-only options before the dev file writer calls Rollup, removing `Unknown input options: platform` warnings.
