---
'@crxjs/vite-plugin': minor
---

Fix "TypeError: plugins is not iterable" error when using rolldown-vite (Vite
7).

In rolldown-vite, the buildStart hook doesn't receive options.plugins. This fix
uses the configResolved hook to get plugins from the resolved config, with
buildStart kept as a fallback for older Vite versions.
