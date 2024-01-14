---
'@crxjs/vite-plugin': patch
---

Vite 5 moved vite manifest from 'manifest.json' to '.vite/manifest.json'. 
This change updates the plugin to use the new location if Vite major version is >4, old location otherwise.