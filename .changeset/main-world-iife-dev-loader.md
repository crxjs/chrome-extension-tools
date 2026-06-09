---
"@crxjs/vite-plugin": patch
---

Run manifest-declared IIFE content scripts directly in dev mode instead of through the async loader. This keeps MAIN world `document_start` scripts able to patch host-page APIs such as `fetch` and XHR before page scripts run.
