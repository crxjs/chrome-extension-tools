---
"@crxjs/vite-plugin": patch
---

Serve manifest-declared IIFE content scripts (`.iife.*` files and `contentScripts.standaloneFiles`) as real IIFE bundles in dev mode instead of routing them through the async dev loader. This makes their execution timing consistent with build output and with dynamically registered IIFE scripts (#1225).
