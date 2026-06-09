---
"@crxjs/vite-plugin": patch
---

Allow `chrome-extension://` and `moz-extension://` origins in Vite dev-server CORS automatically. This keeps extension pages able to fetch dev-server files on Vite releases with the stricter localhost-only CORS default, including Vite `4.5.6`, `5.4.12`, and `6.0.9+`, without requiring projects to configure `server.cors.origin` manually.
