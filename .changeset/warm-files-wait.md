---
'@crxjs/vite-plugin': patch
---

Coalesce file writer readiness waits so large dev-server graph updates do not repeatedly recompute the same dependency traversal. This also fixes late HMR readiness waits that could miss the shared ready event and delay content script updates.
