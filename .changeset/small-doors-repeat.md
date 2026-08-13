---
"@crxjs/vite-plugin": patch
---

Union match patterns across all content_scripts entries that declare the same script file, so web_accessible_resources covers every registration instead of only the last one (fixes #1233).
