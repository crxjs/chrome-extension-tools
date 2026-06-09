---
"@crxjs/vite-plugin": patch
---

Fix the dev-mode loading page so it waits for the requested extension HTML file, preserves the page URL query string, allows extension-origin readiness polling, and throttles automatic reloads to avoid rapid flicker.
