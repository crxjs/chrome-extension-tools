---
"@crxjs/vite-plugin": patch
---

Run manifest-declared IIFE content scripts directly in dev mode instead of through the async loader. This keeps MAIN world `document_start` scripts able to patch host-page APIs such as `fetch` and XHR before page scripts run.

Warn when manifest-declared `document_start` scripts are not configured as IIFE/standalone, since the async loader can miss the earliest host page scripts.

Handle dynamic content script placeholders when Rolldown emits them inside array literals, keeping dynamic IIFE registrations working in Vite 8.
