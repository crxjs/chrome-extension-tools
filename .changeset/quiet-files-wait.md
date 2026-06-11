---
"@crxjs/vite-plugin": patch
---

Limit concurrent dev file writes and debounce readiness checks to reduce memory usage when serving extensions with large module graphs.
