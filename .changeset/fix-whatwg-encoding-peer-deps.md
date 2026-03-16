---
'@crxjs/vite-plugin': patch
---

Replace cheerio with node-html-parser to fix npm deprecation warning for
whatwg-encoding.

Also adds explicit vite peerDependency declaration (^3.0.0 through ^7.0.0) to
enable proper version resolution when used with different vite versions.
