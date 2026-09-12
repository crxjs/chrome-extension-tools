---
"@crxjs/vite-plugin": major
---

Drop CommonJS support and ship ESM only. The `require` export condition, the `dist/index.cjs` build and the root `index.cjs`/`index.d.cts` shims were removed; `main` now points at the ESM output. CommonJS consumers must use dynamic `import()`.
