---
'@crxjs/vite-plugin': patch
---

Fix sandbox pages looping on the development loading screen. Emit their HTML and
module dependencies locally and support hot updates without requiring access to
extension APIs.
