---
"@crxjs/vite-plugin": patch
---

Harden content-script HMR ports so disconnected extension runtime ports are treated like closed WebSocket connections, failed `postMessage` calls are logged instead of surfacing as uncaught page errors, and the runtime-port reconnect interval can be configured for tests and advanced dev setups.
