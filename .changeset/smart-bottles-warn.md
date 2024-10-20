---
'@crxjs/vite-plugin': major
---

fix: workaround for the issue with chrome.runtime.getURL introduced in Chrome 130 causing CSP rejecting script due to different origin (GUID instead of chrome extension id)