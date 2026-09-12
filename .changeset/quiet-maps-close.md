---
'@crxjs/vite-plugin': patch
---

Keep no-import content scripts syntactically valid with source maps by closing
their generated IIFE before the trailing `sourceMappingURL` comment.
