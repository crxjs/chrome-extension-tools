---
"@crxjs/vite-plugin": patch
---

Expand vite-plugin CI to run e2e tests against supported Vite versions and fix compatibility issues exposed by the matrix. Extension origins are now added to dev-server CORS automatically, so users and templates no longer need to configure `server.cors.origin` for `chrome-extension://` or `moz-extension://` during development.
