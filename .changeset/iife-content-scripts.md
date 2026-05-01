---
"@crxjs/vite-plugin": minor
---

feat: add IIFE content script bundling

Content scripts named with `.iife.ts` extension are automatically bundled as self-contained IIFE files with all dependencies inlined. This is useful for MAIN world content scripts used with `chrome.scripting.executeScript` or `chrome.scripting.registerContentScripts`.
