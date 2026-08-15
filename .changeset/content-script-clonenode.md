---
"@crxjs/vite-plugin": patch
---

Guard the dev-mode custom-elements polyfill for content scripts so `document.cloneNode(true)` does not throw when `ownerDocument` is null.
