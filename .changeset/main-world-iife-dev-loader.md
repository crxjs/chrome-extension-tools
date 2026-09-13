---
'@crxjs/vite-plugin': patch
---

Warn when manifest-declared `document_start` scripts are not configured as
IIFE/standalone, since the async loader can miss the earliest host page scripts.

Keep live reload available for declared and dynamic IIFE content scripts without
deferring their execution through the dev loader.

Handle dynamic content script placeholders when Rolldown emits them inside array
literals, keeping dynamic IIFE registrations working in Vite 8.
