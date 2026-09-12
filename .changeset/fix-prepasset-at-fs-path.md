---
"@crxjs/vite-plugin": patch
---

Fix dev server crash when a monorepo workspace package imports assets (images, SVGs, etc.) from its own source tree outside the Vite root. `prepAsset` was reading the file with `join(server.config.root, id)`, but `pathe.join` does not treat a `/@fs/…` Vite URL as an absolute path and produces an incorrect path like `<root>/@fs/<abs-path>`. Strip the `/@fs` prefix to recover the real absolute filesystem path before calling `readFile`.
