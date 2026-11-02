---
'@crxjs/vite-plugin': patch
---

Let Chrome handle `/_favicon/` requests instead of proxying them to the Vite dev
server, so favicons load in extension pages during development.
